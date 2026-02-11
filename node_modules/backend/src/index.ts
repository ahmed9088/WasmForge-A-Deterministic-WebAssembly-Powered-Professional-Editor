import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = 'kinetic-super-secret';
const app = new Hono();

// Simple In-memory storage with Versioning
const projects: Record<string, {
    id: string;
    name: string;
    state: any;
    actions: any[];
    versions: { id: number; state: any; timestamp: number }[];
    sequence: number;
}> = {};
const users: any[] = [];

// Auth Middleware
const auth = async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        c.set('user', payload);
        await next();
    } catch (e) {
        return c.json({ error: 'Invalid token' }, 401);
    }
};

// --- API ROUTES ---

app.get('/', (c) => c.text('Kinetic API v1'));

app.post('/register', async (c) => {
    const { email, password } = await c.req.json();
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedPassword });
    return c.json({ status: 'registered' });
});

app.post('/login', async (c) => {
    const { email, password } = await c.req.json();
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }
    const token = jwt.sign({ email }, JWT_SECRET);
    return c.json({ token });
});

app.post('/projects', auth, async (c) => {
    const { name, initialState } = await c.req.json();
    const id = `proj-${Date.now()}`;
    projects[id] = {
        id,
        name,
        state: initialState,
        actions: [],
        versions: [{ id: 1, state: initialState, timestamp: Date.now() }]
    };
    return c.json(projects[id]);
});

app.get('/projects/:id', auth, (c) => {
    const id = c.req.param('id');
    return c.json(projects[id] || { error: 'Not found' });
});

app.post('/projects/:id/snapshot', auth, async (c) => {
    const id = c.req.param('id');
    const project = projects[id];
    if (!project) return c.json({ error: 'Not found' }, 404);

    const newVersionId = project.versions.length + 1;
    project.versions.push({
        id: newVersionId,
        state: project.state,
        timestamp: Date.now()
    });

    return c.json({ status: 'snapshotted', versionId: newVersionId });
});

app.post('/projects/:id/rollback', auth, async (c) => {
    const id = c.req.param('id');
    const { versionId } = await c.req.json();
    const project = projects[id];
    if (!project) return c.json({ error: 'Not found' }, 404);

    const version = project.versions.find(v => v.id === versionId);
    if (!version) return c.json({ error: 'Version not found' }, 400);

    project.state = version.state;
    // Clear future actions or handle branching? 
    // Simply reset for now (destructive rollback)
    project.actions = [];

    return c.json({ status: 'rolled_back', state: project.state });
});

// --- SERVER SETUP ---

const server = serve({
    fetch: app.fetch,
    port: 8080
});

// --- WEBSOCKET SERVER (Collaboration) ---

const wss = new WebSocketServer({ port: 8081 });
const rooms: Record<string, Set<any>> = {};

wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, 'http://localhost');
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
        ws.close();
        return;
    }

    if (!rooms[projectId]) rooms[projectId] = new Set();
    rooms[projectId].add(ws);

    console.log(`User joined project: ${projectId}`);

    ws.on('message', (message) => {
        const action = JSON.parse(message.toString());
        const project = projects[projectId];

        if (project) {
            // Sequence-based Conflict Resolution
            // Increment server sequence
            project.sequence++;
            action.serverSequence = project.sequence;

            // Persist
            project.actions.push(action);

            // Broadcast
            rooms[projectId].forEach(client => {
                if (client !== ws && client.readyState === ws.OPEN) {
                    client.send(JSON.stringify(action));
                }
            });
        }
    });

    ws.on('close', () => {
        rooms[projectId].delete(ws);
        console.log(`User left project: ${projectId}`);
    });
});

console.log('API Server: http://localhost:8080');
console.log('WS Server: ws://localhost:8081');

export default app;
