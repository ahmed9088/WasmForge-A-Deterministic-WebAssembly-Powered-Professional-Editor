import { Action, Point } from './KineticTypes';
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
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    private handleMouseDown = (e: MouseEvent) => {
        const coords = this.getNormalizedCoords(e);
        const state = this.bridge.getState();

        // Hit Testing (Ideally delegated to WASM for large scenes)
        const hitId = this.performHitTest(coords, state);

        if (hitId) {
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
            // Simple scalar resizing logic for demonstration
            const factor = 1 + (dx / 100);
            this.bridge.dispatch({
                type: 'RESIZE_ELEMENT',
                payload: { id: this.selectedElementId, factor },
            });
        }

        this.lastMousePos = coords;
    };

    private handleMouseUp = () => {
        this.isDragging = false;
        this.mode = 'NONE';
    };

    private handleKeyDown = (e: KeyboardEvent) => {
        // Example shortcut: Delete/Backspace
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElementId) {
            // Note: DELETE_ELEMENT would need implementation in WASM core
            console.log(`Action: DELETE_ELEMENT(${this.selectedElementId})`);
        }

        // Custom shortcuts
        const combo = `${e.ctrlKey ? 'Ctrl+' : ''}${e.key}`;
        this.shortcuts.get(combo)?.();
    };

    private performHitTest(p: Point, state: any): string | null {
        for (const [id, rect] of Object.entries(state.elements) as [string, any][]) {
            if (
                p.x >= rect.origin.x &&
                p.x <= rect.origin.x + rect.width &&
                p.y >= rect.origin.y &&
                p.y <= rect.origin.y + rect.height
            ) {
                return id;
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
