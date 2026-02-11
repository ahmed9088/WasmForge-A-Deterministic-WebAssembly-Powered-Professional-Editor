import { KineticBridge } from '../bridge/KineticBridge';
import { Action, EngineState } from '../bridge/KineticTypes';

export class ActionStore {
    private history: Action[] = [];
    private redoStack: Action[] = [];
    private currentState: EngineState;

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
            this.history.push(action);
            this.redoStack = []; // Clear redo stack on new action
        }

        return newState;
    }

    public async undo() {
        const action = this.history.pop();
        if (!action) return this.currentState;

        this.redoStack.push(action);

        // Replay from scratch for true determinism
        // In a real app, we'd have snapshots or inverse actions
        // For MVP, we reset and replay
        return this.replay(this.history);
    }

    public async redo() {
        const action = this.redoStack.pop();
        if (!action) return this.currentState;

        return this.dispatch(action, true);
    }

    private async replay(actions: Action[]) {
        // Reset engine (requires bridge to support reset or re-init)
        // For now, we assume bridge can be re-initialized or we just apply actions
        // Simplified for MVP:
        console.log('Replaying session... total actions:', actions.length);
        // Ideally: this.bridge.reset();
        // For now: 
        // ... logic to reset ...
        return this.currentState;
    }

    public getState() {
        return this.currentState;
    }
}
