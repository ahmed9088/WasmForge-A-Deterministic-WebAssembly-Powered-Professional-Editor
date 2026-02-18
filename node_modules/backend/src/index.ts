import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ── Config ──────────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-in-production';
const API_PORT = parseInt(process.env.API_PORT || '8080', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '8081', 10);

// ── Types ───────────────────────────────────────────────────────────────────────
interface User {
    email: string;
    password: string;
    createdAt: number;
}

interface ProjectVersion {
    id: number;
    state: any;
    timestamp: number;
}

interface Project {
    id: string;
    name: string;
    ownerId: string;
    state: any;
    actions: any[];
    versions: ProjectVersion[];
    sequence: number;
    createdAt: number;
    updatedAt: number;
}

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// ── Storage ─────────────────────────────────────────────────────────────────────
const projects: Record<string, Project> = {};
const users: User[] = [];
const rateLimitMap: Map<string, RateLimitEntry> = new Map();

// ── Helpers ─────────────────────────────────────────────────────────────────────
function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): boolean {
    return typeof password === 'string' && password.length >= 6;
}

function isRateLimited(key: string, maxRequests = 10, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        return false;
    }

    entry.count++;
    return entry.count > maxRequests;
}

function errorResponse(message: string, details?: string) {
    return { error: message, ...(details ? { details } : {}) };
}

// ── App ─────────────────────────────────────────────────────────────────────────
const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────────
app.use('*', cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
}));

// Auth Middleware
const auth = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json(errorResponse('Unauthorized', 'Missing or malformed Authorization header'), 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { email: string };
        c.set('user', payload);
        await next();
    } catch (e) {
        return c.json(errorResponse('Invalid token', 'Token expired or malformed'), 401);
    }
};

// ── Public Routes ───────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({
    name: 'WasmForge API',
    version: '2.0.0',
    status: 'operational',
    timestamp: Date.now()
}));

app.get('/health', (c) => c.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
    timestamp: Date.now()
}));

// ── Auth Routes ─────────────────────────────────────────────────────────────────
app.post('/register', async (c) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    if (isRateLimited(`register:${ip}`, 5, 60_000)) {
        return c.json(errorResponse('Rate limited', 'Too many registration attempts'), 429);
    }

    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json(errorResponse('Invalid JSON body'), 400);
    }

    const { email, password } = body;

    if (!email || !validateEmail(email)) {
        return c.json(errorResponse('Invalid email', 'Must be a valid email address'), 400);
    }
    if (!password || !validatePassword(password)) {
        return c.json(errorResponse('Invalid password', 'Must be at least 6 characters'), 400);
    }

    if (users.find(u => u.email === email)) {
        return c.json(errorResponse('Email already registered'), 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    users.push({ email, password: hashedPassword, createdAt: Date.now() });

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    return c.json({ status: 'registered', token }, 201);
});

app.post('/login', async (c) => {
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    if (isRateLimited(`login:${ip}`, 10, 60_000)) {
        return c.json(errorResponse('Rate limited', 'Too many login attempts'), 429);
    }

    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json(errorResponse('Invalid JSON body'), 400);
    }

    const { email, password } = body;

    if (!email || !password) {
        return c.json(errorResponse('Missing credentials'), 400);
    }

    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return c.json(errorResponse('Invalid credentials'), 401);
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
    return c.json({ token });
});

// ── Project Routes ──────────────────────────────────────────────────────────────
app.post('/projects', auth, async (c) => {
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json(errorResponse('Invalid JSON body'), 400);
    }

    const { name, initialState } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return c.json(errorResponse('Invalid project name'), 400);
    }

    const user = c.get('user') as { email: string };
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    projects[id] = {
        id,
        name: name.trim(),
        ownerId: user.email,
        state: initialState || { elements: {}, selection: [] },
        actions: [],
        versions: [{ id: 1, state: initialState || {}, timestamp: now }],
        sequence: 0,
        createdAt: now,
        updatedAt: now
    };

    return c.json(projects[id], 201);
});

app.get('/projects', auth, (c) => {
    const user = c.get('user') as { email: string };
    const userProjects = Object.values(projects)
        .filter(p => p.ownerId === user.email)
        .map(({ id, name, createdAt, updatedAt, sequence }) => ({
            id, name, createdAt, updatedAt, actionCount: sequence
        }));
    return c.json({ projects: userProjects });
});

app.get('/projects/:id', auth, (c) => {
    const id = c.req.param('id');
    const project = projects[id];
    if (!project) return c.json(errorResponse('Project not found'), 404);
    return c.json(project);
});

app.delete('/projects/:id', auth, (c) => {
    const id = c.req.param('id');
    const user = c.get('user') as { email: string };
    const project = projects[id];

    if (!project) return c.json(errorResponse('Project not found'), 404);
    if (project.ownerId !== user.email) return c.json(errorResponse('Forbidden'), 403);

    delete projects[id];
    return c.json({ status: 'deleted' });
});

app.post('/projects/:id/snapshot', auth, async (c) => {
    const id = c.req.param('id');
    const project = projects[id];
    if (!project) return c.json(errorResponse('Project not found'), 404);

    const newVersionId = project.versions.length + 1;
    project.versions.push({
        id: newVersionId,
        state: JSON.parse(JSON.stringify(project.state)),
        timestamp: Date.now()
    });
    project.updatedAt = Date.now();

    return c.json({ status: 'snapshotted', versionId: newVersionId });
});

app.get('/projects/:id/versions', auth, (c) => {
    const id = c.req.param('id');
    const project = projects[id];
    if (!project) return c.json(errorResponse('Project not found'), 404);

    return c.json({
        versions: project.versions.map(v => ({
            id: v.id,
            timestamp: v.timestamp
        }))
    });
});

app.post('/projects/:id/rollback', auth, async (c) => {
    const id = c.req.param('id');
    let body: any;
    try {
        body = await c.req.json();
    } catch {
        return c.json(errorResponse('Invalid JSON body'), 400);
    }

    const { versionId } = body;
    if (!versionId || typeof versionId !== 'number') {
        return c.json(errorResponse('Invalid versionId', 'Must be a number'), 400);
    }

    const project = projects[id];
    if (!project) return c.json(errorResponse('Project not found'), 404);

    const version = project.versions.find(v => v.id === versionId);
    if (!version) return c.json(errorResponse('Version not found'), 400);

    project.state = JSON.parse(JSON.stringify(version.state));
    project.actions = [];
    project.updatedAt = Date.now();

    return c.json({ status: 'rolled_back', state: project.state });
});

// ── 404 Handler ─────────────────────────────────────────────────────────────────
app.notFound((c) => c.json(errorResponse('Not Found', `Route ${c.req.method} ${c.req.path} does not exist`), 404));

// ── Error Handler ───────────────────────────────────────────────────────────────
app.onError((err, c) => {
    console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message);
    return c.json(errorResponse('Internal Server Error'), 500);
});

// ── Server Setup ────────────────────────────────────────────────────────────────
const server = serve({
    fetch: app.fetch,
    port: API_PORT
});

// ── WebSocket Server (Collaboration) ────────────────────────────────────────────
const wss = new WebSocketServer({ port: WS_PORT });
const rooms: Record<string, Set<WebSocket>> = {};

function verifyWsToken(token: string | null): { email: string } | null {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as { email: string };
    } catch {
        return null;
    }
}

wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, 'http://localhost');
    const projectId = url.searchParams.get('projectId');
    const token = url.searchParams.get('token');

    // Verify authentication
    const user = verifyWsToken(token);
    if (!user) {
        ws.close(4001, 'Unauthorized');
        return;
    }

    if (!projectId || !projects[projectId]) {
        ws.close(4004, 'Project not found');
        return;
    }

    // Join room
    if (!rooms[projectId]) rooms[projectId] = new Set();
    rooms[projectId].add(ws);

    console.log(`[WS] ${user.email} joined project: ${projectId} (${rooms[projectId].size} clients)`);

    // Send current state on connect
    ws.send(JSON.stringify({
        type: 'SYNC_STATE',
        payload: { state: projects[projectId].state, sequence: projects[projectId].sequence }
    }));

    ws.on('message', (message) => {
        try {
            const action = JSON.parse(message.toString());
            const project = projects[projectId];

            if (!project) return;

            // Sequence-based Conflict Resolution
            project.sequence++;
            action.serverSequence = project.sequence;
            action.userId = user.email;

            // Persist
            project.actions.push(action);
            project.updatedAt = Date.now();

            // Broadcast to all other clients in the room
            rooms[projectId]?.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(action));
                }
            });
        } catch (err) {
            console.error('[WS] Failed to process message:', err);
        }
    });

    ws.on('close', () => {
        rooms[projectId]?.delete(ws);
        if (rooms[projectId]?.size === 0) delete rooms[projectId];
        console.log(`[WS] ${user.email} left project: ${projectId}`);
    });

    ws.on('error', (err) => {
        console.error(`[WS] Error for ${user.email}:`, err.message);
    });
});

console.log(`🚀 WasmForge API Server: http://localhost:${API_PORT}`);
console.log(`🔌 WasmForge WS Server:  ws://localhost:${WS_PORT}`);
console.log(`🏥 Health Check:         http://localhost:${API_PORT}/health`);

export default app;
