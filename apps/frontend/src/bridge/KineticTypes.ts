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

export type Shape =
  | { kind: 'Rect', data: Rect }
  | { kind: 'Circle', data: Circle }
  | { kind: 'Group', data: { children: string[] } }
  | { kind: 'Image', data: { src: string, width: number, height: number } };

export interface Keyframe {
  time: number;
  value: any;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'cubic-bezier';
}

export interface Element {
  id: string;
  name: string;
  shape: Shape;
  fill: string;
  opacity: number;
  visible: boolean;
  parentId?: string;
  animations: Record<string, Keyframe[]>; // e.g. "x": [...keyframes]
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
  | { type: 'ADD_ELEMENT'; payload: { id: string; shape: Shape; fill: string; name?: string } }
  | { type: 'REMOVE_ELEMENT'; payload: { id: string } }
  | { type: 'MOVE_ELEMENT'; payload: { id: string; dx: number; dy: number } }
  | { type: 'SET_FILL'; payload: { id: string; fill: string } }
  | { type: 'SET_VIEW'; payload: { transform: Transform } }
  | { type: 'UPDATE_PRESENCE'; payload: { presence: Presence } }
  | { type: 'GROUP_ELEMENTS'; payload: { groupId: string; children: string[] } }
  | { type: 'SET_TIME'; payload: { time: number } }
  | { type: 'TOGGLE_PLAYBACK'; payload: {} }
  | { type: 'ADD_KEYFRAME'; payload: { elementId: string; property: string; keyframe: Keyframe } };

export interface WasmEngineInstance {
  dispatch(action: any): any;
  get_state(): any;
  free(): void;
}
