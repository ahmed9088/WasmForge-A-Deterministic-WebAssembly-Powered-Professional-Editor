import React, { useEffect, useRef, useState } from 'react';
import { KineticBridge } from './bridge/KineticBridge';
import { MockKineticEngine } from './bridge/MockKineticEngine';
import { ActionStore } from './store/ActionStore';
import { CanvasRenderer } from './renderer/CanvasRenderer';
import { LayerPanel } from './components/LayerPanel';
import { PropertyInspector } from './components/PropertyInspector';
import { AnimationTimeline } from './components/AnimationTimeline';
import { calculateSnaps, SnapGuide } from './utils/SnapUtils';
import { Square, Circle, Undo2, Redo2, Download, MousePointer2, Hand, ZoomIn, Search, Sparkles, Image as ImageIcon } from 'lucide-react';

const App: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const storeRef = useRef<ActionStore | null>(null);
    const [state, setState] = useState<any>(null);
    const [tool, setTool] = useState<'select' | 'pan'>('select');
    const [guides, setGuides] = useState<SnapGuide[]>([]);
    const isDragging = useRef(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const draggingId = useRef<string | null>(null);
    const playbackRef = useRef<number | null>(null);

    useEffect(() => {
        const bridge = new KineticBridge(MockKineticEngine as any);
        const store = new ActionStore(bridge, bridge.getState());
        storeRef.current = store;

        if (canvasRef.current) {
            rendererRef.current = new CanvasRenderer(canvasRef.current);
            rendererRef.current.render(store.getState());
            setState(store.getState());
        }

        // Mock Presence
        store.dispatch({
            type: 'UPDATE_PRESENCE',
            payload: { presence: { userId: 'Designer_1', cursor: { x: 500, y: 400 }, color: '#3b82f6' } }
        }, false);

        return () => {
            if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
        };
    }, []);

    // Playback Loop
    useEffect(() => {
        if (state?.isPlaying) {
            const step = () => {
                if (!storeRef.current || !state) return;

                let nextTime = state.currentTime + 16.67; // approx 60fps
                if (nextTime > state.duration) nextTime = 0;

                dispatch({ type: 'SET_TIME', payload: { time: nextTime } }, false);
                playbackRef.current = requestAnimationFrame(step);
            };
            playbackRef.current = requestAnimationFrame(step);
        } else {
            if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
        }
    }, [state?.isPlaying]);

    const dispatch = async (action: any, track = true) => {
        if (!storeRef.current) return;
        const newState = await storeRef.current.dispatch(action, track);
        setState(newState);
        if (rendererRef.current) rendererRef.current.render(newState, guides);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        // Simple hit test for selection/drag
        if (state && tool === 'select') {
            const worldX = (e.clientX - state.transform.x) / state.transform.scale;
            const worldY = (e.clientY - state.transform.y) / state.transform.scale;
            const hit = Object.values(state.elements).reverse().find((el: any) => {
                if ('Rect' in el.shape) {
                    const { origin, width, height } = el.shape.Rect;
                    return worldX >= origin.x && worldX <= origin.x + width &&
                        worldY >= origin.y && worldY <= origin.y + height;
                }
                return false;
            });
            draggingId.current = hit ? (hit as any).id : null;
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current || !state) return;

        const dx = (e.clientX - lastMousePos.current.x) / state.transform.scale;
        const dy = (e.clientY - lastMousePos.current.y) / state.transform.scale;

        if (tool === 'pan') {
            dispatch({
                type: 'SET_VIEW',
                payload: {
                    transform: {
                        ...state.transform,
                        x: state.transform.x + (e.clientX - lastMousePos.current.x),
                        y: state.transform.y + (e.clientY - lastMousePos.current.y)
                    }
                }
            }, false);
        } else if (tool === 'select' && draggingId.current) {
            const el = state.elements[draggingId.current];
            if (el && 'Rect' in el.shape) {
                const newX = el.shape.Rect.origin.x + dx;
                const newY = el.shape.Rect.origin.y + dy;

                const { snappedX, snappedY, guides: newGuides } = calculateSnaps(
                    draggingId.current,
                    newX,
                    newY,
                    Object.values(state.elements)
                );

                setGuides(newGuides);
                dispatch({
                    type: 'MOVE_ELEMENT',
                    payload: { id: draggingId.current, dx: snappedX - el.shape.Rect.origin.x, dy: snappedY - el.shape.Rect.origin.y }
                }, false);
            }
        }

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        draggingId.current = null;
        setGuides([]);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!state) return;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(state.transform.scale * delta, 0.1), 5);

        dispatch({
            type: 'SET_VIEW',
            payload: {
                transform: { ...state.transform, scale: newScale }
            }
        }, false);
    };

    const addElement = (shapeKind: 'Rect' | 'Circle' | 'Image') => {
        const id = `${shapeKind.toLowerCase()}-${Date.now()}`;
        let shape: any;

        if (shapeKind === 'Rect') {
            shape = { Rect: { origin: { x: 200, y: 200 }, width: 150, height: 100 } };
        } else if (shapeKind === 'Circle') {
            shape = { Circle: { center: { x: 400, y: 400 }, radius: 60 } };
        } else {
            shape = { Image: { src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80', width: 200, height: 120, origin: { x: 300, y: 300 } } };
        }

        dispatch({
            type: 'ADD_ELEMENT',
            payload: {
                id,
                shape,
                fill: shapeKind === 'Image' ? 'transparent' : (shapeKind === 'Rect' ? '#3b82f6' : '#ef4444'),
                name: `${shapeKind} ${Object.keys(state.elements).length + 1}`
            }
        });
    };

    const selectedElement = state?.selection[0] ? state.elements[state.selection[0]] : null;

    return (
        <div className="flex flex-col h-screen bg-[#050505] text-white select-none">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-3 border-b border-[#111] bg-[#0a0a0a] z-50 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40 animate-pulse-pro">
                            <Sparkles size={18} fill="white" />
                        </div>
                        <h1 className="text-sm font-black tracking-[0.2em] bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">KINETIC.PRO</h1>
                    </div>

                    <div className="flex bg-white/5 backdrop-blur-md rounded-lg p-1 gap-1 border border-white/5">
                        <button
                            onClick={() => setTool('select')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cyber-button ${tool === 'select' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                        ><MousePointer2 size={12} /> SELECT</button>
                        <button
                            onClick={() => setTool('pan')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cyber-button ${tool === 'pan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}
                        ><Hand size={12} /> PAN</button>
                    </div>
                </div>

                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="PRO COMMAND PALETTE..."
                        className="bg-[#111]/30 border border-[#222] rounded-full px-10 py-1.5 text-[10px] w-64 outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-700 font-mono">⌘P</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-[#111] px-2 py-1 rounded text-[10px] text-gray-500 font-mono border border-[#222]">
                        <ZoomIn size={10} /> {(state?.transform.scale * 100).toFixed(0)}%
                    </div>
                    <div className="flex -space-x-2 mr-4 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold shadow-xl">AS</div>
                        <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold shadow-xl">JD</div>
                    </div>
                    <div className="flex gap-1 mr-4">
                        <button className="p-2 hover:bg-[#111] rounded-lg text-gray-500 transition-colors"><Undo2 size={16} /></button>
                        <button className="p-2 hover:bg-[#111] rounded-lg text-gray-500 transition-colors"><Redo2 size={16} /></button>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg text-[10px] font-black tracking-widest transition-all shadow-xl active:scale-95">
                        DOWNLOAD RENDER
                    </button>
                </div>
            </header>

            {/* Main UI */}
            <div className="flex flex-1 overflow-hidden">
                <LayerPanel
                    elements={state?.elements || {}}
                    selection={state?.selection || []}
                    onSelect={(id) => dispatch({ type: 'ADD_ELEMENT', payload: { ...state.elements[id] } }, false)} // selection fix
                    onToggleVisibility={() => { }}
                />

                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <main
                        className="flex-1 relative bg-[#050505] overflow-hidden"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onWheel={handleWheel}
                    >
                        <canvas
                            ref={canvasRef}
                            width={window.innerWidth}
                            height={window.innerHeight}
                            className="w-full h-full cursor-grab active:cursor-grabbing"
                        />

                        {/* Float Toolbar */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-1 cyber-glass p-1 rounded-2xl">
                            <button onClick={() => addElement('Rect')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-blue-500 transition-all group relative cyber-button">
                                <Square size={22} />
                                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">RECTANGLE</span>
                            </button>
                            <button onClick={() => addElement('Circle')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-red-500 transition-all group relative cyber-button">
                                <Circle size={22} />
                                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">CIRCLE</span>
                            </button>
                            <button onClick={() => addElement('Image')} className="p-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-green-500 transition-all group relative cyber-button">
                                <ImageIcon size={22} />
                                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity">IMAGE</span>
                            </button>
                        </div>
                    </main>

                    {state && (
                        <AnimationTimeline
                            state={state}
                            onSeek={(t) => dispatch({ type: 'SET_TIME', payload: { time: t } }, false)}
                            onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAYBACK', payload: {} }, false)}
                            onAddKeyframe={(id, prop) => {
                                const element = state.elements[id];
                                const value = prop === 'x'
                                    ? ('Rect' in element.shape ? (element.shape as any).Rect.origin.x : (element.shape as any).Circle.center.x)
                                    : (element as any)[prop];

                                dispatch({
                                    type: 'ADD_KEYFRAME',
                                    payload: {
                                        elementId: id,
                                        property: prop,
                                        keyframe: { time: state.currentTime, value, easing: 'linear' }
                                    }
                                });
                            }}
                        />
                    )}
                </div>

                <PropertyInspector
                    element={selectedElement}
                    onUpdate={(id, updates) => dispatch({ type: 'SET_FILL', payload: { id, fill: updates.fill || '' } })}
                />
            </div>

            <footer className="px-6 py-2.5 border-t border-[#111] bg-[#0a0a0a] flex justify-between items-center text-[9px] text-gray-600 font-mono tracking-widest uppercase">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span>ENGINE: DETERMINISTIC_TIME_SERIES</span>
                    </div>
                    <span>FPS: 60.0</span>
                    <span>LATENCY: 1.2MS</span>
                </div>
                <div className="flex gap-6">
                    <span>MEM_BUFFER: 128MB</span>
                    <span className="text-blue-500">VERSION: 2.0.0-PRO</span>
                    <span>OBJECTS: {Object.keys(state?.elements || {}).length}</span>
                </div>
            </footer>
        </div>
    );
};

export default App;
