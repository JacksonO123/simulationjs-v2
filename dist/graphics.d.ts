import { vec3 } from 'gl-matrix';
import { Color, LerpFunc } from './simulation';
export declare abstract class SimulationElement {
    private pos;
    private color;
    triangleCache: TriangleCache;
    constructor(pos: vec3, color?: Color);
    getPos(): vec3;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: vec3, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    abstract getBuffer(): Float32Array;
}
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    constructor(pos: vec3, width: number, height: number, color?: Color, rotation?: number);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): Float32Array;
}
type Triangles = (readonly [vec3, vec3, vec3])[];
declare class TriangleCache {
    private triangles;
    private hasUpdated;
    constructor();
    setCache(triangles: Triangles): void;
    getCache(): Triangles;
    updated(): void;
    shouldUpdate(): boolean;
    getTriangleCount(): number;
}
export declare class Circle extends SimulationElement {
    private radius;
    private detail;
    constructor(pos: vec3, radius: number, color?: Color);
    setRadius(num: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): Float32Array;
}
export declare class Polygon extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: vec3, points: vec3[], color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setPoints(newPoints: vec3[], t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): Float32Array;
}
export declare class Line extends SimulationElement {
    private lineEl;
    constructor(pos1: vec3, pos2: vec3, thickness?: number, color?: Color);
    getTriangleCount(): number;
    getBuffer(): Float32Array;
}
export declare function vec3From(x?: number, y?: number, z?: number): vec3;
export declare function vec3ToPixelRatio(vec: vec3): void;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export {};
