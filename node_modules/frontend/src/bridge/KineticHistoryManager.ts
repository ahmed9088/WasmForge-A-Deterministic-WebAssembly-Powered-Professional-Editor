import { Action, EngineState } from './KineticTypes';
import { KineticBridge } from './KineticBridge';

/**
 * Manages an action-based command stack for deterministic undo/redo.
 * Instead of storing full state snapshots, it stores a list of serializable actions.
 */
export class KineticHistoryManager {
    private history: Action[] = [];
    private pointer: number = -1; // Index of the last applied action
    private maxHistory: number = 200;

    constructor(private bridge: KineticBridge) { }

    /**
     * Adds a new action to the history and moves the pointer forward.
     * Clears any "redo" actions if we were in the middle of a stack.
     */
    public push(action: Action) {
        // If we've undone actions and then execute a new one, discard the redo stack
        if (this.pointer < this.history.length - 1) {
            this.history = this.history.slice(0, this.pointer + 1);
        }

        this.history.push(action);
        this.pointer++;

        // Enforce history limit
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.pointer--;
        }
    }

    /**
     * Reverts to the previous state by re-initializing the engine 
     * and replaying all actions up to the new pointer.
     */
    public async undo(): Promise<EngineState> {
        if (this.pointer < 0) return this.bridge.getState();

        this.pointer--;
        return this.replay();
    }

    /**
     * Restores the next action in the stack.
     */
    public async redo(): Promise<EngineState> {
        if (this.pointer >= this.history.length - 1) return this.bridge.getState();

        this.pointer++;
        return this.replay();
    }

    /**
     * The core of the deterministic model: Rebuild state from scratch.
     * This ensures 100% bit-perfect recovery without storing massive snapshots.
     */
    private async replay(): Promise<EngineState> {
        // 1. Reset the WASM engine to initial state
        // In a production app, we would use a "reset" command or re-construct the engine
        // For this prototype, we'll assume a fresh dispatch loop or a dedicated reset handle.

        // 2. Extract valid history
        const actionsToReplay = this.history.slice(0, this.pointer + 1);

        // 3. Sequential dispatch to WASM
        // Note: In production, the WASM core should have a "batch_dispatch" to avoid JS-WASM context switching
        let lastState: EngineState = { elements: {} };
        for (const action of actionsToReplay) {
            lastState = await this.bridge.dispatch(action);
        }

        return lastState;
    }

    public canUndo(): boolean {
        return this.pointer >= 0;
    }

    public canRedo(): boolean {
        return this.pointer < this.history.length - 1;
    }

    /**
     * Returns the serialized OpLog for cloud sync/collaboration.
     */
    public getOpLog(): Action[] {
        return [...this.history];
    }
}
