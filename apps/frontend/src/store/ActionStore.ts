import { KineticBridge } from '../bridge/KineticBridge';
import { Action, EngineState } from '../bridge/KineticTypes';

export class ActionStore {
    private history: Action[] = [];
    private redoStack: Action[] = [];
    private currentState: EngineState;
    private lastActionTime: number = 0;
    private lastActionType: string = '';
    private coalesceTimeoutMs: number = 300;

    constructor(
        private bridge: KineticBridge,
        initialState: EngineState
    ) {
        this.currentState = initialState;
    }

    public async dispatch(action: Action, track = true) {
        const newState = await this.bridge.dispatch(action);
        this.currentState = newState;

        if (track) {
            const now = Date.now();
            const shouldCoalesce = this.shouldCoalesce(action, now);

            if (shouldCoalesce && this.history.length > 0) {
                // Replace the last action with this one (coalesce)
                this.history[this.history.length - 1] = action;
            } else {
                this.history.push(action);
            }

            this.lastActionTime = now;
            this.lastActionType = action.type;
            this.redoStack = [];
        }

        return newState;
    }

    /** Determines whether this action should be merged with the previous one */
    private shouldCoalesce(action: Action, now: number): boolean {
        if (now - this.lastActionTime > this.coalesceTimeoutMs) return false;
        if (action.type !== this.lastActionType) return false;

        // Coalesce rapid move sequences on the same element
        if (action.type === 'MOVE_ELEMENT') {
            const prev = this.history[this.history.length - 1];
            if (prev?.type === 'MOVE_ELEMENT') {
                return (prev.payload as any).id === (action.payload as any).id;
            }
        }

        // Coalesce rapid resize/update of the same element
        if (action.type === 'UPDATE_ELEMENT') {
            const prev = this.history[this.history.length - 1];
            if (prev?.type === 'UPDATE_ELEMENT') {
                return (prev.payload as any).id === (action.payload as any).id;
            }
        }

        // Coalesce rapid SET_FILL on the same element
        if (action.type === 'SET_FILL') {
            const prev = this.history[this.history.length - 1];
            if (prev?.type === 'SET_FILL') {
                return (prev.payload as any).id === (action.payload as any).id;
            }
        }

        return false;
    }

    public async undo(): Promise<EngineState> {
        const action = this.history.pop();
        if (!action) return this.currentState;

        this.redoStack.push(action);
        this.lastActionTime = 0; // Reset coalescing on undo

        return this.replay(this.history);
    }

    public async redo(): Promise<EngineState> {
        const action = this.redoStack.pop();
        if (!action) return this.currentState;

        this.history.push(action);
        this.lastActionTime = 0;

        return this.replay(this.history);
    }

    private async replay(actions: Action[]): Promise<EngineState> {
        this.bridge.reset();
        let state = this.bridge.getState();

        for (const action of actions) {
            state = await this.bridge.dispatch(action);
        }

        this.currentState = state;
        return state;
    }

    public getState(): EngineState {
        return this.currentState;
    }

    public getHistoryLength(): number {
        return this.history.length;
    }

    public getRedoLength(): number {
        return this.redoStack.length;
    }

    public canUndo(): boolean {
        return this.history.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }
}
