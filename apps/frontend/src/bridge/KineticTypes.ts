export type Scalar = number;

export interface Point {
  x: Scalar;
  y: Scalar;
}

export interface Rect {
  origin: Point;
  width: Scalar;
  height: Scalar;
}

export interface Circle {
  center: Point;
  radius: Scalar;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

// Shape uses tagged-union format matching the Rust engine output.
// In runtime, shapes look like: { Rect: { origin, width, height } }
export type Shape =
  | { Rect: Rect }
  | { Circle: Circle }
  | { Group: { children: string[] } }
  | { Image: { src: string; width: number; height: number; origin: Point } };

export interface Keyframe {
  time: number;
  value: any;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic' | 'cubic-bezier';
}

export interface Shadow {
  color: string;
  blur: number;
  x: number;
  y: number;
}

export interface Element {
  id: string;
  name: string;
  shape: Shape;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  shadow: Shadow;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  parentId?: string;
  animations: Record<string, Keyframe[]>;
}

export interface Presence {
  userId: string;
  cursor: Point;
  color: string;
}

export interface EngineState {
  elements: Record<string, Element>;
  selection: string[];
  transform: Transform;
  presence: Record<string, Presence>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export type Action =
  | { type: 'ADD_ELEMENT'; payload: { id: string; shape: Shape; fill: string; name?: string; stroke?: string; strokeWidth?: number; cornerRadius?: number; shadow?: Shadow; opacity?: number } }
  | { type: 'REMOVE_ELEMENT'; payload: { id: string } }
  | { type: 'MOVE_ELEMENT'; payload: { id: string; dx: number; dy: number } }
  | { type: 'SET_FILL'; payload: { id: string; fill: string } }
  | { type: 'SET_VIEW'; payload: { transform: Transform } }
  | { type: 'UPDATE_PRESENCE'; payload: { presence: Presence } }
  | { type: 'GROUP_ELEMENTS'; payload: { groupId: string; children: string[] } }
  | { type: 'UNGROUP_ELEMENTS'; payload: { groupId: string } }
  | { type: 'SET_TIME'; payload: { time: number } }
  | { type: 'TOGGLE_PLAYBACK'; payload: Record<string, never> }
  | { type: 'ADD_KEYFRAME'; payload: { elementId: string; property: string; keyframe: Keyframe } }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; updates: Record<string, any> } }
  | { type: 'SET_SELECTION'; payload: { ids: string[] } }
  | { type: 'DUPLICATE_ELEMENT'; payload: { sourceId: string; newId: string } }
  | { type: 'REORDER_ELEMENTS'; payload: { id: string; direction: 'up' | 'down' | 'top' | 'bottom' } }
  | { type: 'LOCK_ELEMENT'; payload: { id: string } }
  | { type: 'UNLOCK_ELEMENT'; payload: { id: string } }
  | { type: 'TOGGLE_VISIBILITY'; payload: { id: string } };

export interface WasmEngineInstance {
  dispatch(action: any): any;
  get_state(): any;
  reset(): void;
  free(): void;
}
