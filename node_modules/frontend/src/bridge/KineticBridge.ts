import { Action, EngineState, WasmEngineInstance } from './KineticTypes';

/**
 * High-level TypeScript bridge for the Kinetic Media Engine.
 * Provides type safety and error handling over the raw WASM interface.
 */
export class KineticBridge {
    private engine: WasmEngineInstance | null = null;
    private isProcessing = false;

    constructor(private EngineCtor: any) {
        this.engine = new EngineCtor();
    }

    /**
     * Dispatches a deterministic action to the Rust engine.
     * @param action The command to execute.
     * @returns The updated project state.
     */
    public async dispatch(action: Action): Promise<EngineState> {
        if (!this.engine) throw new Error('Engine not initialized');
        if (this.isProcessing) {
            console.warn('[KineticBridge] Concurrent dispatch detected. This might affect 60FPS UI performance.');
        }

        this.isProcessing = true;
        try {
            // WASM call (Sync in main thread or Async if in Worker)
            const state = this.engine.dispatch(action);
            return state as EngineState;
        } catch (error) {
            console.error('[KineticBridge] Action Dispatch Failed:', action.type, error);
            throw new Error(`Engine Error: ${error}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Returns a deep copy of the current project state from WASM.
     */
    public getState(): EngineState {
        if (!this.engine) throw new Error('Engine not initialized');
        return this.engine.get_state() as EngineState;
    }

    /**
     * Resets the engine to its initial state.
     * Used by the ActionStore for deterministic undo/redo replay.
     */
    public reset(): void {
        if (this.engine) {
            this.engine.reset();
            console.log('[KineticBridge] Engine State Reset');
        }
    }

    /**
     * Explicitly releases WASM memory.
     * Crucial for preventing leaks in long-lived SaaS sessions.
     */
    public dispose(): void {
        if (this.engine) {
            this.engine.free();
            this.engine = null;
            console.log('[KineticBridge] Engine Memory Released');
        }
    }
}
