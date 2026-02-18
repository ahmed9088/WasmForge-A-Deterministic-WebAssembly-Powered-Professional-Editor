import { Action, EngineState, Element, Keyframe, Transform } from './KineticTypes';

export class MockKineticEngine {
    private state: EngineState = this.createInitialState();

    private computedState: Record<string, Element> = {};

    constructor() { }

    private createInitialState(): EngineState {
        return {
            elements: {},
            selection: [],
            transform: { x: 0, y: 0, scale: 1 },
            presence: {},
            currentTime: 0,
            duration: 5000,
            isPlaying: false
        };
    }

    public reset(): void {
        this.state = this.createInitialState();
        this.computedState = {};
    }

    public dispatch(action: Action): EngineState {
        const { type, payload } = action as any;

        switch (type) {
            case 'SET_SELECTION':
                this.state.selection = payload.ids;
                break;

            case 'ADD_ELEMENT':
                if (this.state.elements[payload.id]) break;
                this.state.elements[payload.id] = {
                    id: payload.id,
                    name: payload.name || `Element ${Object.keys(this.state.elements).length + 1}`,
                    shape: payload.shape,
                    fill: payload.fill || '#3b82f6',
                    stroke: payload.stroke || 'transparent',
                    strokeWidth: payload.strokeWidth || 0,
                    cornerRadius: payload.cornerRadius || 0,
                    shadow: payload.shadow || { color: 'transparent', blur: 0, x: 0, y: 0 },
                    opacity: payload.opacity ?? 1,
                    visible: true,
                    locked: false,
                    zIndex: Object.keys(this.state.elements).length,
                    animations: {}
                };
                break;

            case 'REMOVE_ELEMENT':
                delete this.state.elements[payload.id];
                this.state.selection = this.state.selection.filter(id => id !== payload.id);
                break;

            case 'MOVE_ELEMENT': {
                const el = this.state.elements[payload.id];
                if (el && !el.locked) {
                    this.translateRecursive(el, payload.dx, payload.dy);
                }
                break;
            }

            case 'SET_TIME':
                this.state.currentTime = payload.time;
                break;

            case 'TOGGLE_PLAYBACK':
                this.state.isPlaying = !this.state.isPlaying;
                break;

            case 'ADD_KEYFRAME': {
                const targetEl = this.state.elements[payload.elementId];
                if (targetEl) {
                    if (!targetEl.animations[payload.property]) targetEl.animations[payload.property] = [];
                    targetEl.animations[payload.property] = [
                        ...targetEl.animations[payload.property].filter((k: Keyframe) => k.time !== payload.keyframe.time),
                        payload.keyframe
                    ].sort((a: Keyframe, b: Keyframe) => a.time - b.time);
                }
                break;
            }

            case 'SET_VIEW':
                this.state.transform = payload.transform;
                break;

            case 'UPDATE_PRESENCE':
                this.state.presence[payload.presence.userId] = payload.presence;
                break;

            case 'UPDATE_ELEMENT': {
                const existing = this.state.elements[payload.id];
                if (existing) {
                    const updates = payload.updates;
                    this.state.elements[payload.id] = {
                        ...existing,
                        ...updates,
                        shape: updates.shape ? this.mergeShape(existing.shape, updates.shape) : existing.shape,
                        shadow: updates.shadow ? { ...existing.shadow, ...updates.shadow } : existing.shadow
                    };
                }
                break;
            }

            case 'DUPLICATE_ELEMENT': {
                const source = this.state.elements[payload.sourceId];
                if (source) {
                    const clone = JSON.parse(JSON.stringify(source)) as Element;
                    clone.id = payload.newId;
                    clone.name = `${source.name} (copy)`;
                    clone.zIndex = Object.keys(this.state.elements).length;

                    // Offset the clone slightly
                    if ('Rect' in clone.shape) {
                        (clone.shape as any).Rect.origin.x += 20;
                        (clone.shape as any).Rect.origin.y += 20;
                    } else if ('Circle' in clone.shape) {
                        (clone.shape as any).Circle.center.x += 20;
                        (clone.shape as any).Circle.center.y += 20;
                    } else if ('Image' in clone.shape) {
                        (clone.shape as any).Image.origin.x += 20;
                        (clone.shape as any).Image.origin.y += 20;
                    }

                    this.state.elements[payload.newId] = clone;
                }
                break;
            }

            case 'REORDER_ELEMENTS': {
                const allElements = Object.values(this.state.elements).sort((a, b) => a.zIndex - b.zIndex);
                const idx = allElements.findIndex(e => e.id === payload.id);
                if (idx === -1) break;

                switch (payload.direction) {
                    case 'up':
                        if (idx < allElements.length - 1) {
                            const temp = allElements[idx].zIndex;
                            allElements[idx].zIndex = allElements[idx + 1].zIndex;
                            allElements[idx + 1].zIndex = temp;
                        }
                        break;
                    case 'down':
                        if (idx > 0) {
                            const temp = allElements[idx].zIndex;
                            allElements[idx].zIndex = allElements[idx - 1].zIndex;
                            allElements[idx - 1].zIndex = temp;
                        }
                        break;
                    case 'top':
                        allElements[idx].zIndex = Math.max(...allElements.map(e => e.zIndex)) + 1;
                        break;
                    case 'bottom':
                        allElements[idx].zIndex = Math.min(...allElements.map(e => e.zIndex)) - 1;
                        break;
                }
                break;
            }

            case 'LOCK_ELEMENT': {
                const lockEl = this.state.elements[payload.id];
                if (lockEl) lockEl.locked = true;
                break;
            }

            case 'UNLOCK_ELEMENT': {
                const unlockEl = this.state.elements[payload.id];
                if (unlockEl) unlockEl.locked = false;
                break;
            }

            case 'TOGGLE_VISIBILITY': {
                const visEl = this.state.elements[payload.id];
                if (visEl) visEl.visible = !visEl.visible;
                break;
            }

            case 'GROUP_ELEMENTS': {
                const groupId = payload.groupId;
                const children: string[] = payload.children;
                this.state.elements[groupId] = {
                    id: groupId,
                    name: `Group ${Object.keys(this.state.elements).length + 1}`,
                    shape: { Group: { children } },
                    fill: 'transparent',
                    stroke: 'transparent',
                    strokeWidth: 0,
                    cornerRadius: 0,
                    shadow: { color: 'transparent', blur: 0, x: 0, y: 0 },
                    opacity: 1,
                    visible: true,
                    locked: false,
                    zIndex: Object.keys(this.state.elements).length,
                    animations: {}
                };
                children.forEach(childId => {
                    if (this.state.elements[childId]) {
                        this.state.elements[childId].parentId = groupId;
                    }
                });
                break;
            }

            case 'UNGROUP_ELEMENTS': {
                const group = this.state.elements[payload.groupId];
                if (group && 'Group' in group.shape) {
                    const childIds = (group.shape as any).Group.children as string[];
                    childIds.forEach(childId => {
                        if (this.state.elements[childId]) {
                            delete this.state.elements[childId].parentId;
                        }
                    });
                    delete this.state.elements[payload.groupId];
                }
                break;
            }
        }

        this.recomputeInterpolatedState();
        return JSON.parse(JSON.stringify({ ...this.state, elements: this.computedState }));
    }

    private mergeShape(existing: any, updates: any): any {
        const merged = { ...existing };
        for (const key of ['Rect', 'Circle', 'Image', 'Group']) {
            if (updates[key] && existing[key]) {
                merged[key] = { ...existing[key] };
                for (const prop of Object.keys(updates[key])) {
                    if (typeof updates[key][prop] === 'object' && updates[key][prop] !== null && !Array.isArray(updates[key][prop])) {
                        // Deep merge nested objects (origin, center, etc.)
                        merged[key][prop] = { ...(existing[key][prop] || {}), ...updates[key][prop] };
                    } else {
                        merged[key][prop] = updates[key][prop];
                    }
                }
            } else if (updates[key]) {
                merged[key] = updates[key];
            }
        }
        return merged;
    }

    private recomputeInterpolatedState() {
        this.computedState = JSON.parse(JSON.stringify(this.state.elements));
        const time = this.state.currentTime;

        Object.values(this.computedState).forEach(el => {
            Object.entries(el.animations).forEach(([prop, keyframes]) => {
                if (keyframes.length === 0) return;

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
            } else if ('Image' in el.shape) {
                if (prop === 'x') (el.shape as any).Image.origin.x = val;
                if (prop === 'y') (el.shape as any).Image.origin.y = val;
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
        } else if ('Image' in el.shape) {
            (el.shape as any).Image.origin.x += dx;
            (el.shape as any).Image.origin.y += dy;
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
