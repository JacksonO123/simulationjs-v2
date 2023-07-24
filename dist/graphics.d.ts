import { vec3 } from 'gl-matrix';
import { Color, LerpFunc } from './simulation';
export declare abstract class SimulationElement {
    private pos;
    private color;
    constructor(pos: vec3, color?: Color);
    getPos(): vec3;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: vec3, t?: number, f?: LerpFunc): Promise<void>;
    abstract getBuffer(): Float32Array;
    abstract getTriangleCount(): number;
}
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    constructor(pos: vec3, width: number, height: number, color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    getBuffer(): Float32Array;
}
export declare function vec3From(x?: number, y?: number, z?: number): vec3;
export declare function vec3ToPixelRatio(vec: vec3): void;
