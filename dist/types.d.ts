import { Color } from './simulation.js';
export type Vector3 = Float32Array & [number, number, number];
export type Vector2 = Float32Array & [number, number];
export type LerpFunc = (n: number) => number;
export type VertexColorMap = Record<0 | 1 | 2 | 3, Color>;