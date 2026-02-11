import { Action, EngineState, Element, Keyframe, Transform } from './KineticTypes';

export class MockKineticEngine {
    private state: EngineState = {
        elements: {},
        selection: [],
        transform: { x: 0, y: 0, scale: 1 },
        presence: {},
        currentTime: 0,
        duration: 5000, // 5 seconds
        isPlaying: false
    };

    private computedState: Record<string, Element> = {};

    constructor() { }

    public dispatch(action: Action): EngineState {
        const { type, payload } = action as any;

        switch (type) {
            case 'ADD_ELEMENT':
                this.state.elements[payload.id] = {
                    id: payload.id,
                    name: payload.name || `Element ${Object.keys(this.state.elements).length + 1}`,
                    shape: payload.shape,
                    fill: payload.fill,
                    opacity: 1,
                    visible: true,
                    animations: {}
                };
                break;
            case 'REMOVE_ELEMENT':
                delete this.state.elements[payload.id];
                this.state.selection = this.state.selection.filter(id => id !== payload.id);
                break;
            case 'MOVE_ELEMENT':
                const el = this.state.elements[payload.id];
                if (el) {
                    this.translateRecursive(el, payload.dx, payload.dy);
                }
                break;
            case 'SET_TIME':
                this.state.currentTime = payload.time;
                break;
            case 'TOGGLE_PLAYBACK':
                this.state.isPlaying = !this.state.isPlaying;
                break;
            case 'ADD_KEYFRAME':
                const targetEl = this.state.elements[payload.elementId];
                if (targetEl) {
                    if (!targetEl.animations[payload.property]) targetEl.animations[payload.property] = [];
                    targetEl.animations[payload.property] = [
                        ...targetEl.animations[payload.property].filter(k => k.time !== payload.keyframe.time),
                        payload.keyframe
                    ].sort((a, b) => a.time - b.time);
                }
                break;
            case 'SET_VIEW':
                this.state.transform = payload.transform;
                break;
            case 'UPDATE_PRESENCE':
                this.state.presence[payload.presence.userId] = payload.presence;
                break;
        }

        this.recomputeInterpolatedState();
        return JSON.parse(JSON.stringify({ ...this.state, elements: this.computedState }));
    }

    private recomputeInterpolatedState() {
        this.computedState = JSON.parse(JSON.stringify(this.state.elements));
        const time = this.state.currentTime;

        Object.values(this.computedState).forEach(el => {
            Object.entries(el.animations).forEach(([prop, keyframes]) => {
                if (keyframes.length === 0) return;

                // Find keyframe boundary
                let start = keyframes[0];
                let end = keyframes[0];

                for (let i = 0; i < keyframes.length; i++) {
                    if (keyframes[i].time <= time) start = keyframes[i];
                    if (keyframes[i].time > time) {
                        end = keyframes[i];
                        break;
                    }
                }

                if (start === end) {
                    this.applyPropertyValue(el, prop, start.value);
                } else {
                    const t = (time - start.time) / (end.time - start.time);
                    const val = this.lerp(start.value, end.value, t);
                    this.applyPropertyValue(el, prop, val);
                }
            });
        });
    }

    private lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
    }

    private applyPropertyValue(el: Element, prop: string, val: any) {
        if (prop === 'x' || prop === 'y') {
            if ('Rect' in el.shape) {
                if (prop === 'x') (el.shape as any).Rect.origin.x = val;
                if (prop === 'y') (el.shape as any).Rect.origin.y = val;
            } else if ('Circle' in el.shape) {
                if (prop === 'x') (el.shape as any).Circle.center.x = val;
                if (prop === 'y') (el.shape as any).Circle.center.y = val;
            }
        } else {
            (el as any)[prop] = val;
        }
    }

    private translateRecursive(el: Element, dx: number, dy: number) {
        if ('Rect' in el.shape) {
            (el.shape as any).Rect.origin.x += dx;
            (el.shape as any).Rect.origin.y += dy;
        } else if ('Circle' in el.shape) {
            (el.shape as any).Circle.center.x += dx;
            (el.shape as any).Circle.center.y += dy;
        } else if ('Group' in el.shape) {
            (el.shape as any).Group.children.forEach((childId: string) => {
                const child = this.state.elements[childId];
                if (child) this.translateRecursive(child, dx, dy);
            });
        }
    }

    public get_state(): EngineState {
        this.recomputeInterpolatedState();
        return JSON.parse(JSON.stringify({ ...this.state, elements: this.computedState }));
    }

    public free(): void {
        console.log('Mock Engine memory released');
    }
}
