import { Action, Point, EngineState, Element } from './KineticTypes';
import { KineticBridge } from './KineticBridge';

type InteractionMode = 'MOVE' | 'RESIZE' | 'NONE';

/**
 * Manages user input (mouse/keyboard) and translates them into deterministic actions.
 * Ensures no direct state mutation in the UI layer.
 */
export class KineticInputManager {
    private isDragging = false;
    private mode: InteractionMode = 'NONE';
    private selectedElementId: string | null = null;
    private lastMousePos: Point = { x: 0, y: 0 };

    // Keyboard Shortcut Registry
    private shortcuts: Map<string, () => void> = new Map();

    constructor(
        private canvas: HTMLCanvasElement,
        private bridge: KineticBridge
    ) {
        this.initEvents();
    }

    private initEvents() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Normalizes screen coordinates to the Canvas coordinate system.
     */
    private getNormalizedCoords(e: MouseEvent): Point {
        const rect = this.canvas.getBoundingClientRect();
        const state = this.bridge.getState();
        return {
            x: (e.clientX - rect.left - state.transform.x) / state.transform.scale,
            y: (e.clientY - rect.top - state.transform.y) / state.transform.scale,
        };
    }

    private handleMouseDown = (e: MouseEvent) => {
        const coords = this.getNormalizedCoords(e);
        const state = this.bridge.getState();

        const hitId = this.performHitTest(coords, state);

        if (hitId) {
            const el = state.elements[hitId];
            if (el?.locked) return; // Can't interact with locked elements
            this.isDragging = true;
            this.selectedElementId = hitId;
            this.lastMousePos = coords;
            this.mode = e.shiftKey ? 'RESIZE' : 'MOVE';
        } else {
            this.selectedElementId = null;
        }
    };

    private handleMouseMove = (e: MouseEvent) => {
        if (!this.isDragging || !this.selectedElementId) return;

        const coords = this.getNormalizedCoords(e);
        const dx = coords.x - this.lastMousePos.x;
        const dy = coords.y - this.lastMousePos.y;

        if (this.mode === 'MOVE') {
            this.bridge.dispatch({
                type: 'MOVE_ELEMENT',
                payload: { id: this.selectedElementId, dx, dy },
            });
        } else if (this.mode === 'RESIZE') {
            // Resize by updating element shape directly
            const state = this.bridge.getState();
            const el = state.elements[this.selectedElementId];
            if (el && 'Rect' in el.shape) {
                const rect = (el.shape as any).Rect;
                this.bridge.dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                        id: this.selectedElementId,
                        updates: {
                            shape: { Rect: { ...rect, width: Math.max(10, rect.width + dx), height: Math.max(10, rect.height + dy) } }
                        }
                    },
                });
            } else if (el && 'Circle' in el.shape) {
                const circle = (el.shape as any).Circle;
                this.bridge.dispatch({
                    type: 'UPDATE_ELEMENT',
                    payload: {
                        id: this.selectedElementId,
                        updates: {
                            shape: { Circle: { ...circle, radius: Math.max(5, circle.radius + dx) } }
                        }
                    },
                });
            }
        }

        this.lastMousePos = coords;
    };

    private handleMouseUp = () => {
        this.isDragging = false;
        this.mode = 'NONE';
    };

    private handleKeyDown = (e: KeyboardEvent) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElementId) {
            this.bridge.dispatch({
                type: 'REMOVE_ELEMENT',
                payload: { id: this.selectedElementId },
            });
            this.selectedElementId = null;
        }

        // Custom shortcuts
        const combo = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
        this.shortcuts.get(combo)?.();
    };

    private performHitTest(p: Point, state: EngineState): string | null {
        // Reverse iterate to hit top-most (highest zIndex) first
        const sorted = Object.values(state.elements)
            .filter(el => el.visible && !el.locked)
            .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

        for (const el of sorted) {
            if ('Rect' in el.shape) {
                const { origin, width, height } = (el.shape as any).Rect;
                if (p.x >= origin.x && p.x <= origin.x + width &&
                    p.y >= origin.y && p.y <= origin.y + height) {
                    return el.id;
                }
            } else if ('Circle' in el.shape) {
                const { center, radius } = (el.shape as any).Circle;
                const dx = p.x - center.x;
                const dy = p.y - center.y;
                if (dx * dx + dy * dy <= radius * radius) {
                    return el.id;
                }
            } else if ('Image' in el.shape) {
                const { origin, width, height } = (el.shape as any).Image;
                if (p.x >= origin.x && p.x <= origin.x + width &&
                    p.y >= origin.y && p.y <= origin.y + height) {
                    return el.id;
                }
            }
        }
        return null;
    }

    public registerShortcut(combo: string, callback: () => void) {
        this.shortcuts.set(combo, callback);
    }

    public getSelectedId(): string | null {
        return this.selectedElementId;
    }

    public dispose() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.handleKeyDown);
    }
}
