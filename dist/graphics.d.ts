import { vec3 } from 'gl-matrix';
import { Color, LerpFunc } from './simulation';
export declare abstract class SimulationElement {
    private pos;
    private color;
    constructor(pos: vec3, color?: Color);
    getPos(): vec3;
    fill(newColor: Color): void;
    getColor(): Color;
    abstract getBuffer(): Float32Array;
    abstract getTriangleCount(): number;
}
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    constructor(pos: vec3, width: number, height: number, color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    getBuffer(): Float32Array;
}
export declare function vec3From(x?: number, y?: number, z?: number): vec3;
