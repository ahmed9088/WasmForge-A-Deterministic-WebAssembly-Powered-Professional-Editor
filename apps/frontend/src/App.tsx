import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KineticBridge } from './bridge/KineticBridge';
import { MockKineticEngine } from './bridge/MockKineticEngine';
import { ActionStore } from './store/ActionStore';
import { CanvasRenderer, DragInfo } from './renderer/CanvasRenderer';
import { LayerPanel } from './components/LayerPanel';
import { PropertyInspector } from './components/PropertyInspector';
import { AnimationTimeline } from './components/AnimationTimeline';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { calculateSnaps, SnapGuide } from './utils/SnapUtils';
import { Square, Circle, Undo2, Redo2, Download, MousePointer2, Hand, ZoomIn, Search, Sparkles, Image as ImageIcon, Settings, Cpu, Keyboard, Copy, Trash2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import ThemeCustomizer from './components/ThemeCustomizer';
import EnginePreferences from './components/EnginePreferences';
import { hotkeyManager } from './utils/HotkeyManager';
import { layoutManager } from './utils/LayoutManager';
import { CustomCursor } from './components/CustomCursor';
import { Action, EngineState } from './bridge/KineticTypes';

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | 'resize-circle-n' | 'resize-circle-s' | 'resize-circle-e' | 'resize-circle-w';

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const storeRef = useRef<ActionStore | null>(null);
    const [state, setState] = useState<EngineState | null>(null);
    const latestStateRef = useRef<EngineState | null>(null);
    const [tool, setTool] = useState<'select' | 'pan'>('select');
    const [guides, setGuides] = useState<SnapGuide[]>([]);
    const isDragging = useRef(false);
    const isPanning = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const lastScreenPos = useRef({ x: 0, y: 0 });
    const draggingId = useRef<string | null>(null);
    const dragMode = useRef<DragMode>('move');
    const resizeStart = useRef<{ x: number, y: number, w: number, h: number } | null>(null);
    const playbackRef = useRef<number | null>(null);
    const [showThemeEditor, setShowThemeEditor] = useState(false);
    const [showEnginePrefs, setShowEnginePrefs] = useState(false);
    const [engineConfig, setEngineConfig] = useState<any>(null);
    const [layout, setLayout] = useState(layoutManager.getConfig());
    const [cursor, setCursor] = useState<string>('default');
    const [marquee, setMarquee] = useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);
    const [hoverState, setHoverState] = useState<'default' | 'pointer' | 'grab' | 'text' | 'resize'>('default');
    const [showCommandPalette, setShowCommandPalette] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elementId?: string } | null>(null);
    const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight });
    const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
    const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
    const clipboardRef = useRef<any>(null);
    const panVelocity = useRef({ vx: 0, vy: 0 });
    const animFrameRef = useRef<number>(0);
    const targetTransformRef = useRef<Transform | null>(null);

    // Use refs for functions that should not cause stale closures
    const dispatchRef = useRef<(action: Action, track?: boolean) => Promise<void>>(async () => { });

    const dispatch = useCallback(async (action: Action, track = true) => {
        if (!storeRef.current) return;
        const newState = await storeRef.current.dispatch(action, track);
        latestStateRef.current = newState;
        setState(newState);
    }, []);

    // Keep dispatchRef always current
    useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

    const addElement = useCallback((shapeKind: 'Rect' | 'Circle' | 'Image') => {
        const currentState = latestStateRef.current;
        const id = `${shapeKind.toLowerCase()}-${Date.now()}`;
        let shape: any;
        if (shapeKind === 'Rect') shape = { Rect: { origin: { x: 200, y: 200 }, width: 150, height: 100 } };
        else if (shapeKind === 'Circle') shape = { Circle: { center: { x: 400, y: 400 }, radius: 60 } };
        else shape = { Image: { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', width: 200, height: 120, origin: { x: 300, y: 300 } } };

        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                id, shape,
                name: `${shapeKind} ${currentState?.elements ? Object.keys(currentState.elements).length + 1 : 1}`,
                fill: shapeKind === 'Image' ? 'transparent' : (shapeKind === 'Rect' ? '#3b82f6' : '#ef4444'),
                stroke: 'transparent', strokeWidth: 0, cornerRadius: 0,
                shadow: { color: 'transparent', blur: 0, x: 0, y: 0 }, opacity: 1
            }
        });
        dispatch({ type: 'SET_SELECTION', payload: { ids: [id] } }, false);
    }, [dispatch]);

    const handleUndo = useCallback(async () => {
        if (!storeRef.current) return;
        const s = await storeRef.current.undo();
        latestStateRef.current = s;
        setState(s);
    }, []);

    const handleRedo = useCallback(async () => {
        if (!storeRef.current) return;
        const s = await storeRef.current.redo();
        latestStateRef.current = s;
        setState(s);
    }, []);

    const duplicateSelected = useCallback(() => {
        const currentState = latestStateRef.current;
        const selectedId = currentState?.selection?.[0];
        if (!selectedId) return;
        const newId = `dup-${Date.now()}`;
        dispatch({ type: 'DUPLICATE_ELEMENT', payload: { sourceId: selectedId, newId } });
        dispatch({ type: 'SET_SELECTION', payload: { ids: [newId] } }, false);
    }, [dispatch]);

    const deleteSelected = useCallback(() => {
        const currentState = latestStateRef.current;
        const selectedId = currentState?.selection?.[0];
        if (!selectedId) return;
        dispatch({ type: 'REMOVE_ELEMENT', payload: { id: selectedId } });
    }, [dispatch]);

    // Command palette commands
    const commands = [
        { id: 'add-rect', label: 'Add Rectangle', shortcut: 'R', icon: <Square size={14} />, category: 'Create', action: () => addElement('Rect') },
        { id: 'add-circle', label: 'Add Circle', shortcut: 'C', icon: <Circle size={14} />, category: 'Create', action: () => addElement('Circle') },
        { id: 'add-image', label: 'Add Image', shortcut: 'I', icon: <ImageIcon size={14} />, category: 'Create', action: () => addElement('Image') },
        { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: <Undo2 size={14} />, category: 'Edit', action: handleUndo },
        { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: <Redo2 size={14} />, category: 'Edit', action: handleRedo },
        { id: 'duplicate', label: 'Duplicate Element', shortcut: 'Ctrl+D', icon: <Copy size={14} />, category: 'Edit', action: duplicateSelected },
        { id: 'delete', label: 'Delete Element', shortcut: 'Del', icon: <Trash2 size={14} />, category: 'Edit', action: deleteSelected },
        { id: 'select-tool', label: 'Select Tool', shortcut: 'V', icon: <MousePointer2 size={14} />, category: 'Tools', action: () => setTool('select') },
        { id: 'pan-tool', label: 'Pan Tool', shortcut: 'H', icon: <Hand size={14} />, category: 'Tools', action: () => setTool('pan') },
        { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++', icon: <ZoomIn size={14} />, category: 'View', action: () => { const s = latestStateRef.current; if (s) dispatch({ type: 'SET_VIEW', payload: { transform: { ...s.transform, scale: Math.min(s.transform.scale * 1.2, 5) } } }, false); } },
        { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: '?', icon: <Keyboard size={14} />, category: 'Help', action: () => setShowShortcuts(true) },
    ];

    // Initialize engine & bridge
    useEffect(() => {
        const bridge = new KineticBridge(MockKineticEngine as any);
        const store = new ActionStore(bridge, bridge.getState());
        storeRef.current = store;
        latestStateRef.current = store.getState();

        if (canvasRef.current) {
            rendererRef.current = new CanvasRenderer(canvasRef.current);
            rendererRef.current.render(store.getState());
            setState(store.getState());
        }

        store.dispatch({
            type: 'UPDATE_PRESENCE',
            payload: { presence: { userId: 'Designer_1', cursor: { x: 500, y: 400 }, color: '#3b82f6' } }
        }, false);

        return () => {
            if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
        };
    }, []);

    // Canvas resize handler
    useEffect(() => {
        const handleResize = () => {
            setCanvasSize({ w: window.innerWidth, h: window.innerHeight });
            // Re-render with new size
            const s = latestStateRef.current;
            if (rendererRef.current && s) {
                setTimeout(() => rendererRef.current?.render(s, guides, marquee), 0);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [guides, marquee]);

    // Keyboard shortcuts — use refs to avoid stale closures
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // Escape — close modals/context menu
            if (e.key === 'Escape') {
                setShowCommandPalette(false);
                setShowShortcuts(false);
                setContextMenu(null);
                return;
            }

            // Command Palette
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                setShowCommandPalette(prev => !prev);
                return;
            }

            // Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                const curState = latestStateRef.current;
                const selectedId = curState?.selection?.[0];
                if (!selectedId) return;
                const newId = `dup-${Date.now()}`;
                dispatchRef.current({ type: 'DUPLICATE_ELEMENT', payload: { sourceId: selectedId, newId } });
                dispatchRef.current({ type: 'SET_SELECTION', payload: { ids: [newId] } }, false);
                return;
            }

            // Undo / Redo
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
                e.preventDefault();
                if (storeRef.current) {
                    storeRef.current.redo().then(s => { latestStateRef.current = s; setState(s); });
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (storeRef.current) {
                    storeRef.current.undo().then(s => { latestStateRef.current = s; setState(s); });
                }
                return;
            }

            // Keyboard shortcuts modal
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                setShowShortcuts(prev => !prev);
                return;
            }

            const actionKey = hotkeyManager.getAction(e.code);

            // Ctrl/Cmd shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'c': {
                        e.preventDefault();
                        const curState = latestStateRef.current;
                        const selId = curState?.selection?.[0];
                        if (selId && curState?.elements[selId]) {
                            clipboardRef.current = JSON.parse(JSON.stringify(curState.elements[selId]));
                        }
                        return;
                    }
                    case 'v': {
                        e.preventDefault();
                        if (clipboardRef.current) {
                            const src = clipboardRef.current;
                            const newId = `paste-${Date.now()}`;
                            const offsetShape = JSON.parse(JSON.stringify(src.shape));
                            if ('Rect' in offsetShape) { offsetShape.Rect.origin.x += 20; offsetShape.Rect.origin.y += 20; }
                            else if ('Circle' in offsetShape) { offsetShape.Circle.center.x += 20; offsetShape.Circle.center.y += 20; }
                            else if ('Image' in offsetShape) { offsetShape.Image.origin.x += 20; offsetShape.Image.origin.y += 20; }
                            dispatchRef.current({
                                type: 'ADD_ELEMENT',
                                payload: { id: newId, shape: offsetShape, name: `${src.name} copy`, fill: src.fill, stroke: src.stroke, strokeWidth: src.strokeWidth, cornerRadius: src.cornerRadius, shadow: src.shadow, opacity: src.opacity }
                            });
                            dispatchRef.current({ type: 'SET_SELECTION', payload: { ids: [newId] } }, false);
                        }
                        return;
                    }
                    case '0': {
                        e.preventDefault();
                        const curState = latestStateRef.current;
                        if (!curState) return;
                        const els = Object.values(curState.elements).filter(el => el.visible);
                        if (els.length === 0) { dispatchRef.current({ type: 'SET_VIEW', payload: { transform: { x: 0, y: 0, scale: 1 } } }, false); return; }
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        els.forEach(el => {
                            if ('Rect' in el.shape) { const r = (el.shape as any).Rect; minX = Math.min(minX, r.origin.x); minY = Math.min(minY, r.origin.y); maxX = Math.max(maxX, r.origin.x + r.width); maxY = Math.max(maxY, r.origin.y + r.height); }
                            else if ('Circle' in el.shape) { const c = (el.shape as any).Circle; minX = Math.min(minX, c.center.x - c.radius); minY = Math.min(minY, c.center.y - c.radius); maxX = Math.max(maxX, c.center.x + c.radius); maxY = Math.max(maxY, c.center.y + c.radius); }
                            else if ('Image' in el.shape) { const r = (el.shape as any).Image; minX = Math.min(minX, r.origin.x); minY = Math.min(minY, r.origin.y); maxX = Math.max(maxX, r.origin.x + r.width); maxY = Math.max(maxY, r.origin.y + r.height); }
                        });
                        const cr = canvasRef.current?.getBoundingClientRect();
                        if (!cr) return;
                        const pad = 60;
                        const bw = Math.max(10, maxX - minX);
                        const bh = Math.max(10, maxY - minY);
                        const scale = Math.min((cr.width - pad * 2) / bw, (cr.height - pad * 2) / bh, 3);
                        const tx = (cr.width - bw * scale) / 2 - minX * scale;
                        const ty = (cr.height - bh * scale) / 2 - minY * scale;
                        targetTransformRef.current = { x: tx, y: ty, scale };
                        return;
                    }
                    case '1': {
                        e.preventDefault();
                        targetTransformRef.current = { x: 0, y: 0, scale: 1 };
                        return;
                    }
                }
            }

            // Escape to deselect / close menus
            if (e.key === 'Escape') {
                dispatchRef.current({ type: 'SET_SELECTION', payload: { ids: [] } }, false);
                setContextMenu(null);
                return;
            }

            if (!actionKey) return;

            e.preventDefault();
            switch (actionKey) {
                case 'select': setTool('select'); break;
                case 'pan': setTool('pan'); break;
                case 'add_rect': {
                    const currentState = latestStateRef.current;
                    const id = `rect-${Date.now()}`;
                    dispatchRef.current({
                        type: 'ADD_ELEMENT',
                        payload: { id, shape: { Rect: { origin: { x: 200, y: 200 }, width: 150, height: 100 } }, name: `Rect ${currentState?.elements ? Object.keys(currentState.elements).length + 1 : 1}`, fill: '#3b82f6', stroke: 'transparent', strokeWidth: 0, cornerRadius: 0, shadow: { color: 'transparent', blur: 0, x: 0, y: 0 }, opacity: 1 }
                    });
                    dispatchRef.current({ type: 'SET_SELECTION', payload: { ids: [id] } }, false);
                    break;
                }
                case 'add_circle': {
                    const currentState = latestStateRef.current;
                    const id = `circle-${Date.now()}`;
                    dispatchRef.current({
                        type: 'ADD_ELEMENT',
                        payload: { id, shape: { Circle: { center: { x: 400, y: 400 }, radius: 60 } }, name: `Circle ${currentState?.elements ? Object.keys(currentState.elements).length + 1 : 1}`, fill: '#ef4444', stroke: 'transparent', strokeWidth: 0, cornerRadius: 0, shadow: { color: 'transparent', blur: 0, x: 0, y: 0 }, opacity: 1 }
                    });
                    dispatchRef.current({ type: 'SET_SELECTION', payload: { ids: [id] } }, false);
                    break;
                }
                case 'undo':
                    storeRef.current?.undo().then(s => { latestStateRef.current = s; setState(s); });
                    break;
                case 'redo':
                    storeRef.current?.redo().then(s => { latestStateRef.current = s; setState(s); });
                    break;
                case 'play_toggle':
                    dispatchRef.current({ type: 'TOGGLE_PLAYBACK', payload: {} }, false);
                    break;
                case 'ArrowUp': nudge(0, -1, e.shiftKey); break;
                case 'ArrowDown': nudge(0, 1, e.shiftKey); break;
                case 'ArrowLeft': nudge(-1, 0, e.shiftKey); break;
                case 'ArrowRight': nudge(1, 0, e.shiftKey); break;
                case 'Delete':
                case 'Backspace': {
                    const curState = latestStateRef.current;
                    const selectedId = curState?.selection?.[0];
                    if (selectedId) dispatchRef.current({ type: 'REMOVE_ELEMENT', payload: { id: selectedId } });
                    break;
                }
            }
        };

        const nudge = (dx: number, dy: number, shift: boolean) => {
            const curState = latestStateRef.current;
            if (!curState?.selection[0]) return;
            const factor = shift ? 10 : 1;
            dispatchRef.current({ type: 'MOVE_ELEMENT', payload: { id: curState.selection[0], dx: dx * factor, dy: dy * factor } });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Playback Loop
    useEffect(() => {
        if (state?.isPlaying) {
            const step = () => {
                if (!storeRef.current) return;
                const curState = latestStateRef.current;
                if (!curState) return;
                let nextTime = curState.currentTime + 16.67;
                if (nextTime > curState.duration) nextTime = 0;
                dispatchRef.current({ type: 'SET_TIME', payload: { time: nextTime } }, false);
                playbackRef.current = requestAnimationFrame(step);
            };
            playbackRef.current = requestAnimationFrame(step);
        } else {
            if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
        }
    }, [state?.isPlaying]);

    // Unified rendering — drives animation loop for marching ants + inertial pan
    useEffect(() => {
        let rafId: number;
        const animate = () => {
            const currentState = latestStateRef.current || state;
            if (rendererRef.current && currentState) {
                // Smooth View Interpolation (Zoom & Pan)
                if (targetTransformRef.current) {
                    const target = targetTransformRef.current;
                    const current = currentState.transform;
                    const dx = target.x - current.x;
                    const dy = target.y - current.y;
                    const ds = target.scale - current.scale;

                    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1 || Math.abs(ds) > 0.001) {
                        const lerpX = current.x + dx * 0.15;
                        const lerpY = current.y + dy * 0.15;
                        const lerpS = current.scale + ds * 0.15;

                        dispatchRef.current({
                            type: 'SET_VIEW',
                            payload: { transform: { x: lerpX, y: lerpY, scale: lerpS } }
                        }, false);
                    } else {
                        // Snap to target and clear
                        dispatchRef.current({ type: 'SET_VIEW', payload: { transform: target } }, false);
                        targetTransformRef.current = null;
                    }
                }

                rendererRef.current.render(currentState, guides, marquee, hoveredElementId, dragInfo);
            }
            rafId = requestAnimationFrame(animate);
        };
        rafId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId);
    }, [state, guides, marquee, hoveredElementId, dragInfo]);

    // Update hover state based on cursor
    useEffect(() => {
        if (cursor.includes('resize')) setHoverState('resize');
        else if (cursor === 'move') setHoverState('pointer');
        else if (cursor === 'grab' || cursor === 'grabbing') setHoverState('grab');
        else setHoverState('default');
    }, [cursor]);

    // Close context menu on click
    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // Helper: sort elements by zIndex descending for hit testing (top-most first)
    const getHitTestElements = (currentState: EngineState) => {
        return Object.values(currentState.elements)
            .filter(el => el.visible)
            .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        panVelocity.current = { vx: 0, vy: 0 };
        const rect = canvasRef.current?.getBoundingClientRect();
        const currentState = latestStateRef.current || state;
        if (!rect || !currentState) return;

        const worldX = (e.clientX - rect.left - currentState.transform.x) / currentState.transform.scale;
        const worldY = (e.clientY - rect.top - currentState.transform.y) / currentState.transform.scale;
        lastMousePos.current = { x: worldX, y: worldY };
        lastScreenPos.current = { x: e.clientX, y: e.clientY };

        // Double-click on empty canvas → reset view
        if (e.detail === 2 && tool === 'select') {
            const hit = getHitTestElements(currentState).find((el) => {
                if ('Rect' in el.shape) { const { origin, width, height } = (el.shape as any).Rect; return worldX >= origin.x && worldX <= origin.x + width && worldY >= origin.y && worldY <= origin.y + height; }
                else if ('Circle' in el.shape) { const { center, radius } = (el.shape as any).Circle; return (worldX - center.x) ** 2 + (worldY - center.y) ** 2 <= radius ** 2; }
                else if ('Image' in el.shape) { const { origin, width, height } = (el.shape as any).Image; return worldX >= origin.x && worldX <= origin.x + width && worldY >= origin.y && worldY <= origin.y + height; }
                return false;
            });
            if (!hit) {
                targetTransformRef.current = { x: 0, y: 0, scale: 1 };
                isDragging.current = false;
                return;
            }
        }

        // Middle-click → pan regardless of tool
        if (e.button === 1) {
            e.preventDefault();
            isPanning.current = true;
            setCursor('grabbing');
            return;
        }

        // Pan tool
        if (tool === 'pan') {
            isPanning.current = true;
            setCursor('grabbing');
            return;
        }

        // Check resize handles on selected element
        if (currentState.selection[0]) {
            const el = currentState.elements[currentState.selection[0]];
            if (el && !el.locked) {
                let hitHandle = null;
                const hs = 10 / currentState.transform.scale;

                if ('Rect' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Rect;
                    const handles = [
                        { id: 'resize-nw' as DragMode, x: origin.x, y: origin.y },
                        { id: 'resize-ne' as DragMode, x: origin.x + width, y: origin.y },
                        { id: 'resize-sw' as DragMode, x: origin.x, y: origin.y + height },
                        { id: 'resize-se' as DragMode, x: origin.x + width, y: origin.y + height },
                        { id: 'resize-n' as DragMode, x: origin.x + width / 2, y: origin.y },
                        { id: 'resize-s' as DragMode, x: origin.x + width / 2, y: origin.y + height },
                        { id: 'resize-e' as DragMode, x: origin.x + width, y: origin.y + height / 2 },
                        { id: 'resize-w' as DragMode, x: origin.x, y: origin.y + height / 2 }
                    ];
                    hitHandle = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hitHandle) {
                        dragMode.current = hitHandle.id;
                        draggingId.current = el.id;
                        resizeStart.current = { x: origin.x, y: origin.y, w: width, h: height };
                        return;
                    }
                } else if ('Circle' in el.shape) {
                    const { center, radius } = (el.shape as any).Circle;
                    const handles = [
                        { id: 'resize-circle-n' as DragMode, x: center.x, y: center.y - radius },
                        { id: 'resize-circle-s' as DragMode, x: center.x, y: center.y + radius },
                        { id: 'resize-circle-e' as DragMode, x: center.x + radius, y: center.y },
                        { id: 'resize-circle-w' as DragMode, x: center.x - radius, y: center.y }
                    ];
                    hitHandle = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hitHandle) {
                        dragMode.current = hitHandle.id;
                        draggingId.current = el.id;
                        resizeStart.current = { x: center.x, y: center.y, w: radius, h: radius };
                        return;
                    }
                } else if ('Image' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Image;
                    const handles = [
                        { id: 'resize-nw' as DragMode, x: origin.x, y: origin.y },
                        { id: 'resize-ne' as DragMode, x: origin.x + width, y: origin.y },
                        { id: 'resize-sw' as DragMode, x: origin.x, y: origin.y + height },
                        { id: 'resize-se' as DragMode, x: origin.x + width, y: origin.y + height },
                        { id: 'resize-n' as DragMode, x: origin.x + width / 2, y: origin.y },
                        { id: 'resize-s' as DragMode, x: origin.x + width / 2, y: origin.y + height },
                        { id: 'resize-e' as DragMode, x: origin.x + width, y: origin.y + height / 2 },
                        { id: 'resize-w' as DragMode, x: origin.x, y: origin.y + height / 2 }
                    ];
                    hitHandle = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hitHandle) {
                        dragMode.current = hitHandle.id;
                        draggingId.current = el.id;
                        resizeStart.current = { x: origin.x, y: origin.y, w: width, h: height };
                        return;
                    }
                }
            }
        }

        if (tool === 'select') {
            // Hit test sorted by zIndex (top-most first)
            const hit = getHitTestElements(currentState).find((el) => {
                if (el.locked) return false;
                if ('Rect' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Rect;
                    return worldX >= origin.x && worldX <= origin.x + width &&
                        worldY >= origin.y && worldY <= origin.y + height;
                } else if ('Circle' in el.shape) {
                    const { center, radius } = (el.shape as any).Circle;
                    const ddx = worldX - center.x;
                    const ddy = worldY - center.y;
                    return (ddx * ddx + ddy * ddy) <= (radius * radius);
                } else if ('Image' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Image;
                    return worldX >= origin.x && worldX <= origin.x + width &&
                        worldY >= origin.y && worldY <= origin.y + height;
                }
                return false;
            });

            if (hit) {
                draggingId.current = hit.id;
                dragMode.current = 'move';
                // Shift+Click → toggle multi-select
                if (e.shiftKey) {
                    const existing = [...(currentState.selection || [])];
                    const idx = existing.indexOf(hit.id);
                    if (idx >= 0) existing.splice(idx, 1); else existing.push(hit.id);
                    dispatch({ type: 'SET_SELECTION', payload: { ids: existing } }, false);
                } else {
                    dispatch({ type: 'SET_SELECTION', payload: { ids: [hit.id] } }, false);
                }
            } else {
                draggingId.current = null;
                setMarquee({ start: { x: worldX, y: worldY }, end: { x: worldX, y: worldY } });
                if (!e.shiftKey) dispatch({ type: 'SET_SELECTION', payload: { ids: [] } }, false);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        const currentState = latestStateRef.current || state;
        if (!rect || !currentState) return;

        const worldX = (e.clientX - rect.left - currentState.transform.x) / currentState.transform.scale;
        const worldY = (e.clientY - rect.top - currentState.transform.y) / currentState.transform.scale;

        // Panning (pan tool or middle-click)
        if (isDragging.current && isPanning.current) {
            const sdx = e.clientX - lastScreenPos.current.x;
            const sdy = e.clientY - lastScreenPos.current.y;
            panVelocity.current = { vx: sdx, vy: sdy };
            dispatch({
                type: 'SET_VIEW',
                payload: {
                    transform: {
                        ...currentState.transform,
                        x: currentState.transform.x + sdx,
                        y: currentState.transform.y + sdy
                    }
                }
            }, false);
            lastScreenPos.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (!isDragging.current) {
            // Hover cursor detection
            const hs = 10 / currentState.transform.scale;
            let newCursor = 'default';
            if (currentState.selection[0]) {
                const el = currentState.elements[currentState.selection[0]];
                if (el && !el.locked && 'Rect' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Rect;
                    const handles = [
                        { id: 'nwse-resize', x: origin.x, y: origin.y },
                        { id: 'nesw-resize', x: origin.x + width, y: origin.y },
                        { id: 'nesw-resize', x: origin.x, y: origin.y + height },
                        { id: 'nwse-resize', x: origin.x + width, y: origin.y + height },
                        { id: 'ns-resize', x: origin.x + width / 2, y: origin.y },
                        { id: 'ns-resize', x: origin.x + width / 2, y: origin.y + height },
                        { id: 'ew-resize', x: origin.x + width, y: origin.y + height / 2 },
                        { id: 'ew-resize', x: origin.x, y: origin.y + height / 2 }
                    ];
                    const hit = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hit) newCursor = hit.id;
                } else if (el && !el.locked && 'Circle' in el.shape) {
                    const { center, radius } = (el.shape as any).Circle;
                    const handles = [
                        { id: 'ns-resize', x: center.x, y: center.y - radius },
                        { id: 'ns-resize', x: center.x, y: center.y + radius },
                        { id: 'ew-resize', x: center.x + radius, y: center.y },
                        { id: 'ew-resize', x: center.x - radius, y: center.y }
                    ];
                    const hit = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hit) newCursor = hit.id;
                } else if (el && !el.locked && 'Image' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Image;
                    const handles = [
                        { id: 'nwse-resize', x: origin.x, y: origin.y },
                        { id: 'nesw-resize', x: origin.x + width, y: origin.y },
                        { id: 'nesw-resize', x: origin.x, y: origin.y + height },
                        { id: 'nwse-resize', x: origin.x + width, y: origin.y + height },
                        { id: 'ns-resize', x: origin.x + width / 2, y: origin.y },
                        { id: 'ns-resize', x: origin.x + width / 2, y: origin.y + height },
                        { id: 'ew-resize', x: origin.x + width, y: origin.y + height / 2 },
                        { id: 'ew-resize', x: origin.x, y: origin.y + height / 2 }
                    ];
                    const hit = handles.find(h => Math.abs(worldX - h.x) < hs && Math.abs(worldY - h.y) < hs);
                    if (hit) newCursor = hit.id;
                }
            }
            if (newCursor === 'default' && tool === 'select') {
                const hitEl = getHitTestElements(currentState).find((el) => {
                    if ('Rect' in el.shape) {
                        const { origin, width, height } = (el.shape as any).Rect;
                        return worldX >= origin.x && worldX <= origin.x + width &&
                            worldY >= origin.y && worldY <= origin.y + height;
                    } else if ('Circle' in el.shape) {
                        const { center, radius } = (el.shape as any).Circle;
                        const ddx = worldX - center.x;
                        const ddy = worldY - center.y;
                        return (ddx * ddx + ddy * ddy) <= (radius * radius);
                    } else if ('Image' in el.shape) {
                        const { origin, width, height } = (el.shape as any).Image;
                        return worldX >= origin.x && worldX <= origin.x + width &&
                            worldY >= origin.y && worldY <= origin.y + height;
                    }
                    return false;
                });
                if (hitEl) {
                    newCursor = hitEl.locked ? 'not-allowed' : 'move';
                    setHoveredElementId(hitEl.locked ? null : hitEl.id);
                } else {
                    setHoveredElementId(null);
                }
            } else if (tool === 'pan') {
                newCursor = 'grab';
                setHoveredElementId(null);
            }
            if (cursor !== newCursor) setCursor(newCursor);
            return;
        }

        const dx = worldX - lastMousePos.current.x;
        const dy = worldY - lastMousePos.current.y;

        if (tool === 'select' && draggingId.current) {
            const el = currentState.elements[draggingId.current];
            if (!el || el.locked) return;

            if (dragMode.current === 'move') {
                // Determine absolute move target for snapping
                let snapGuidesResult: SnapGuide[] = [];
                let infoX = 0, infoY = 0, infoW = 0, infoH = 0;
                let currentPos: { x: number, y: number } = { x: 0, y: 0 };
                let shapeKind: string = '';

                if ('Rect' in el.shape) {
                    const r = (el.shape as any).Rect;
                    currentPos = { x: r.origin.x, y: r.origin.y };
                    infoW = r.width; infoH = r.height;
                    shapeKind = 'Rect';
                } else if ('Circle' in el.shape) {
                    const c = (el.shape as any).Circle;
                    currentPos = { x: c.center.x - c.radius, y: c.center.y - c.radius };
                    infoW = c.radius * 2; infoH = c.radius * 2;
                    shapeKind = 'Circle';
                } else if ('Image' in el.shape) {
                    const i = (el.shape as any).Image;
                    currentPos = { x: i.origin.x, y: i.origin.y };
                    infoW = i.width; infoH = i.height;
                    shapeKind = 'Image';
                }

                // Snap logic using absolute world coordinates
                const result = calculateSnaps(el.id, currentPos.x + dx, currentPos.y + dy, Object.values(currentState.elements));
                snapGuidesResult = result.guides;
                infoX = result.snappedX;
                infoY = result.snappedY;

                setGuides(snapGuidesResult);
                setDragInfo({ id: el.id, x: infoX, y: infoY, w: infoW, h: infoH, mode: 'move' });

                // Update element with absolute position
                let updates: any = {};
                if (shapeKind === 'Rect' || shapeKind === 'Image') {
                    const kind = shapeKind as 'Rect' | 'Image';
                    updates = { shape: { [kind]: { ...(el.shape as any)[kind], origin: { x: infoX, y: infoY } } } };
                } else if (shapeKind === 'Circle') {
                    const r = (el.shape as any).Circle.radius;
                    updates = { shape: { Circle: { center: { x: infoX + r, y: infoY + r }, radius: r } } };
                }
                dispatch({ type: 'UPDATE_ELEMENT', payload: { id: draggingId.current!, updates } }, false);
            } else if (dragMode.current.startsWith('resize')) {
                const mode = dragMode.current;
                if (resizeStart.current) {
                    const start = resizeStart.current;
                    if ('Rect' in el.shape || 'Image' in el.shape) {
                        const kind = 'Rect' in el.shape ? 'Rect' : 'Image';
                        let newW = start.w; let newH = start.h; let newX = start.x; let newY = start.y;
                        if (mode.includes('e')) newW = start.w + dx;
                        if (mode.includes('w')) { newX = start.x + dx; newW = start.w - dx; }
                        if (mode.includes('s')) newH = start.h + dy;
                        if (mode.includes('n')) { newY = start.y + dy; newH = start.h - dy; }
                        if (e.shiftKey) {
                            const ratio = start.w / start.h;
                            if (Math.abs(dx) > Math.abs(dy)) newH = newW / ratio;
                            else newW = newH * ratio;
                        }
                        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: draggingId.current, updates: { shape: { [kind]: { origin: { x: newX, y: newY }, width: Math.max(10, newW), height: Math.max(10, newH) } } } } }, false);
                        setDragInfo({ id: el.id, x: newX, y: newY, w: Math.max(10, newW), h: Math.max(10, newH), mode: 'resize' });
                    } else if ('Circle' in el.shape && mode.startsWith('resize-circle-')) {
                        let newRadius = start.w;
                        if (mode.endsWith('e')) newRadius = start.w + dx;
                        if (mode.endsWith('w')) newRadius = start.w - dx;
                        if (mode.endsWith('s')) newRadius = start.h + dy;
                        if (mode.endsWith('n')) newRadius = start.h - dy;
                        const r = Math.max(5, newRadius);
                        setDragInfo({ id: el.id, x: (el.shape as any).Circle.center.x - r, y: (el.shape as any).Circle.center.y - r, w: r * 2, h: r * 2, mode: 'resize' });
                        dispatch({ type: 'UPDATE_ELEMENT', payload: { id: draggingId.current, updates: { shape: { Circle: { radius: r } } } } }, false);
                    }
                }
            }
        } else if (marquee) {
            setMarquee({ ...marquee, end: { x: worldX, y: worldY } });
        }
        lastMousePos.current = { x: worldX, y: worldY };
        lastScreenPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        // Store velocity for inertial pan before clearing state
        const applyInertia = isDragging.current && isPanning.current;
        isDragging.current = false;
        draggingId.current = null;
        resizeStart.current = null;
        setDragInfo(null);
        setHoveredElementId(null);
        if (isPanning.current) {
            isPanning.current = false;
            setCursor(tool === 'pan' ? 'grab' : 'default');
            // Keep panVelocity for inertial animation (already set during mousemove)
            if (!applyInertia) panVelocity.current = { vx: 0, vy: 0 };
        } else {
            panVelocity.current = { vx: 0, vy: 0 };
        }
        setGuides([]);
        const currentState = latestStateRef.current || state;
        if (marquee && currentState) {
            const x1 = Math.min(marquee.start.x, marquee.end.x);
            const y1 = Math.min(marquee.start.y, marquee.end.y);
            const x2 = Math.max(marquee.start.x, marquee.end.x);
            const y2 = Math.max(marquee.start.y, marquee.end.y);
            const selectedIds = Object.values(currentState.elements).filter((el) => {
                if (!el.visible) return false;
                let bx1: number, by1: number, bx2: number, by2: number;
                if ('Rect' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Rect;
                    bx1 = origin.x; by1 = origin.y; bx2 = origin.x + width; by2 = origin.y + height;
                } else if ('Circle' in el.shape) {
                    const { center, radius } = (el.shape as any).Circle;
                    bx1 = center.x - radius; by1 = center.y - radius; bx2 = center.x + radius; by2 = center.y + radius;
                } else if ('Image' in el.shape) {
                    const { origin, width, height } = (el.shape as any).Image;
                    bx1 = origin.x; by1 = origin.y; bx2 = origin.x + width; by2 = origin.y + height;
                } else return false;

                return bx1! >= x1 && bx2! <= x2 && by1! >= y1 && by2! <= y2;
            }).map(el => el.id);
            dispatch({ type: 'SET_SELECTION', payload: { ids: selectedIds } }, false);
        }
        setMarquee(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const currentState = latestStateRef.current || state;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!currentState || !rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.85 : 1.15;
        const current = targetTransformRef.current || currentState.transform;
        const oldScale = current.scale;
        const newScale = Math.min(Math.max(oldScale * delta, 0.05), 10);

        const newX = mouseX - (mouseX - current.x) * (newScale / oldScale);
        const newY = mouseY - (mouseY - current.y) * (newScale / oldScale);

        targetTransformRef.current = { x: newX, y: newY, scale: newScale };
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        const currentState = latestStateRef.current || state;
        if (!rect || !currentState) return;

        const worldX = (e.clientX - rect.left - currentState.transform.x) / currentState.transform.scale;
        const worldY = (e.clientY - rect.top - currentState.transform.y) / currentState.transform.scale;

        const hit = getHitTestElements(currentState).find((el) => {
            if ('Rect' in el.shape) {
                const { origin, width, height } = (el.shape as any).Rect;
                return worldX >= origin.x && worldX <= origin.x + width && worldY >= origin.y && worldY <= origin.y + height;
            } else if ('Circle' in el.shape) {
                const { center, radius } = (el.shape as any).Circle;
                return (worldX - center.x) ** 2 + (worldY - center.y) ** 2 <= radius ** 2;
            } else if ('Image' in el.shape) {
                const { origin, width, height } = (el.shape as any).Image;
                return worldX >= origin.x && worldX <= origin.x + width && worldY >= origin.y && worldY <= origin.y + height;
            }
            return false;
        });

        if (hit) {
            dispatch({ type: 'SET_SELECTION', payload: { ids: [hit.id] } }, false);
            setContextMenu({ x: e.clientX, y: e.clientY, elementId: hit.id });
        } else {
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    const selectedElement = (latestStateRef.current || state)?.selection[0] ? (latestStateRef.current || state)!.elements[(latestStateRef.current || state)!.selection[0]] : null;

    const canUndo = storeRef.current?.canUndo() ?? false;
    const canRedo = storeRef.current?.canRedo() ?? false;

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-white select-none use-custom-cursor">
            <CustomCursor hoverState={hoverState} />
            <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} commands={commands} />
            <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

            <header className="flex items-center justify-between px-6 py-3 border-b border-[#111] bg-[#0a0a0a] z-50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowEnginePrefs(!showEnginePrefs)} className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all ${showEnginePrefs ? 'bg-purple-600 shadow-purple-900/40 text-white' : 'bg-blue-600 shadow-blue-900/40 text-white animate-pulse-pro'}`}><Cpu size={18} /></button>
                        <h1 className="text-sm font-black tracking-[0.2em] bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">WASM.FORGE</h1>
                    </div>
                    <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 gap-1 border border-white/5">
                        <button onClick={() => setTool('select')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cyber-button ${tool === 'select' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}><MousePointer2 size={12} /> SELECT</button>
                        <button onClick={() => setTool('pan')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cyber-button ${tool === 'pan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}><Hand size={12} /> PAN</button>
                    </div>
                </div>
                <button onClick={() => setShowCommandPalette(true)} className="relative group cursor-pointer bg-transparent border-none">
                    <div className="flex items-center gap-2 bg-[#111]/30 border border-[#222] rounded-full px-4 py-1.5 hover:border-blue-500/30 transition-all">
                        <Search size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                        <span className="text-[10px] text-gray-700 group-hover:text-gray-500 transition-colors">PRO COMMAND PALETTE...</span>
                        <kbd className="text-[10px] text-gray-700 font-mono ml-8 px-1.5 py-0.5 bg-white/5 rounded border border-white/5">Ctrl+P</kbd>
                    </div>
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#111] px-2 py-1 rounded text-[10px] text-gray-500 font-mono border border-[#222]"><ZoomIn size={10} /> {(state?.transform.scale ? state.transform.scale * 100 : 100).toFixed(0)}%</div>
                    <div className="flex -space-x-2 mr-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold shadow-xl">AS</div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold shadow-xl">JD</div>
                    </div>
                    <div className="flex gap-1 mr-4">
                        <button onClick={handleUndo} className={`p-2 rounded-lg transition-colors ${canUndo ? 'hover:bg-[#111] text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                        <button onClick={handleRedo} className={`p-2 rounded-lg transition-colors ${canRedo ? 'hover:bg-[#111] text-gray-400 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`} title="Redo (Ctrl+Shift+Z)"><Redo2 size={16} /></button>
                        <button onClick={() => setShowThemeEditor(!showThemeEditor)} className={`p-2 hover:bg-[#111] rounded-lg transition-colors ${showThemeEditor ? 'text-blue-500' : 'text-gray-500'}`}><Settings size={16} /></button>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg text-[10px] font-black tracking-widest transition-all shadow-xl active:scale-95">DOWNLOAD RENDER</button>
                </div>
                {showThemeEditor && <ThemeCustomizer onUpdate={() => rendererRef.current?.render(storeRef.current!.getState(), guides)} onClose={() => setShowThemeEditor(false)} />}
                {showEnginePrefs && <EnginePreferences onUpdate={(config) => setEngineConfig(config)} onClose={() => setShowEnginePrefs(false)} />}
            </header>
            <div className="flex flex-1 overflow-hidden">
                {layout.order.map((panelId) => {
                    if (panelId === 'layers') return (
                        <LayerPanel
                            key="layers"
                            elements={state?.elements || {}}
                            selection={state?.selection || []}
                            onSelect={(id) => dispatch({ type: 'SET_SELECTION', payload: { ids: [id] } }, false)}
                            onToggleVisibility={(id) => dispatch({ type: 'TOGGLE_VISIBILITY', payload: { id } })}
                            onToggleLock={(id) => {
                                const el = state?.elements?.[id];
                                if (el) dispatch({ type: el.locked ? 'UNLOCK_ELEMENT' : 'LOCK_ELEMENT', payload: { id } });
                            }}
                            onReorder={(id, direction) => dispatch({ type: 'REORDER_ELEMENTS', payload: { id, direction } })}
                            onDuplicate={(id) => {
                                const newId = `dup-${Date.now()}`;
                                dispatch({ type: 'DUPLICATE_ELEMENT', payload: { sourceId: id, newId } });
                            }}
                            onDelete={(id) => dispatch({ type: 'REMOVE_ELEMENT', payload: { id } })}
                        />
                    );
                    if (panelId === 'canvas') return (
                        <div key="canvas" className="flex-1 flex flex-col relative overflow-hidden">
                            <main className="flex-1 relative bg-[#050505] overflow-hidden" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} onContextMenu={handleContextMenu} onAuxClick={(e) => e.button === 1 && e.preventDefault()}>
                                <canvas ref={canvasRef} style={{ cursor, width: '100%', height: '100%' }} />
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1 cyber-glass p-1 rounded-2xl">
                                    <button onClick={() => addElement('Rect')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-blue-500 transition-all group relative cyber-button"><Square size={22} /><span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">RECTANGLE</span></button>
                                    <button onClick={() => addElement('Circle')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 transition-all group relative cyber-button"><Circle size={22} /><span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">CIRCLE</span></button>
                                    <button onClick={() => addElement('Image')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-green-500 transition-all group relative cyber-button"><ImageIcon size={22} /><span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">IMAGE</span></button>
                                </div>
                            </main>
                            {state && <AnimationTimeline state={state} onSeek={(t) => dispatch({ type: 'SET_TIME', payload: { time: t } }, false)} onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAYBACK', payload: {} }, false)} onAddKeyframe={(id, prop) => {
                                const element = state.elements[id];
                                const value = prop === 'x' ? ('Rect' in element.shape ? (element.shape as any).Rect.origin.x : (element.shape as any).Circle.center.x) : (element as any)[prop];
                                dispatch({ type: 'ADD_KEYFRAME', payload: { elementId: id, property: prop, keyframe: { time: state.currentTime, value, easing: 'linear' } } });
                            }} />}
                        </div>
                    );
                    if (panelId === 'properties') return <PropertyInspector key="properties" element={selectedElement} onUpdate={(id, updates) => dispatch({ type: 'UPDATE_ELEMENT', payload: { id, updates } })} />;
                    return null;
                })}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
                    {contextMenu.elementId ? (
                        <>
                            <button className="context-menu-item" onClick={() => { duplicateSelected(); setContextMenu(null); }}>
                                <Copy size={12} /> Duplicate
                            </button>
                            <button className="context-menu-item" onClick={() => {
                                const el = state?.elements?.[contextMenu.elementId!];
                                if (el) dispatch({ type: el.locked ? 'UNLOCK_ELEMENT' : 'LOCK_ELEMENT', payload: { id: contextMenu.elementId! } });
                                setContextMenu(null);
                            }}>
                                {state?.elements?.[contextMenu.elementId!]?.locked ? <><Unlock size={12} /> Unlock</> : <><Lock size={12} /> Lock</>}
                            </button>
                            <button className="context-menu-item" onClick={() => {
                                dispatch({ type: 'TOGGLE_VISIBILITY', payload: { id: contextMenu.elementId! } });
                                setContextMenu(null);
                            }}>
                                {state?.elements?.[contextMenu.elementId!]?.visible ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                            </button>
                            <div className="context-menu-divider" />
                            <button className="context-menu-item" onClick={() => {
                                dispatch({ type: 'REORDER_ELEMENTS', payload: { id: contextMenu.elementId!, direction: 'top' } });
                                setContextMenu(null);
                            }}>
                                Bring to Front
                            </button>
                            <button className="context-menu-item" onClick={() => {
                                dispatch({ type: 'REORDER_ELEMENTS', payload: { id: contextMenu.elementId!, direction: 'bottom' } });
                                setContextMenu(null);
                            }}>
                                Send to Back
                            </button>
                            <div className="context-menu-divider" />
                            <button className="context-menu-item danger" onClick={() => { deleteSelected(); setContextMenu(null); }}>
                                <Trash2 size={12} /> Delete
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="context-menu-item" onClick={() => { addElement('Rect'); setContextMenu(null); }}>
                                <Square size={12} /> Add Rectangle
                            </button>
                            <button className="context-menu-item" onClick={() => { addElement('Circle'); setContextMenu(null); }}>
                                <Circle size={12} /> Add Circle
                            </button>
                            <button className="context-menu-item" onClick={() => { addElement('Image'); setContextMenu(null); }}>
                                <ImageIcon size={12} /> Add Image
                            </button>
                        </>
                    )}
                </div>
            )}

            <footer className="px-6 py-2.5 border-t border-[#111] bg-[#0a0a0a] flex justify-between items-center text-[9px] text-gray-600 font-mono tracking-widest uppercase">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span><span>ENGINE: DETERMINISTIC_TIME_SERIES</span></div>
                    <span>FPS: 60.0</span><span>LATENCY: 1.2MS</span>
                </div>
                <div className="flex items-center gap-6">
                    <span>MEM_BUFFER: 128MB</span>
                    <span className="text-blue-500">VERSION: 2.0.0-PRO</span>
                    <span>OBJECTS: {Object.keys(state?.elements || {}).length}</span>
                    <button onClick={() => setShowShortcuts(true)} className="hover:text-gray-400 transition-colors cursor-pointer bg-transparent border-none" title="Keyboard Shortcuts (?)">
                        <Keyboard size={12} />
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
