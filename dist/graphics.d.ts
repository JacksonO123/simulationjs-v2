import { vec3 } from 'wgpu-matrix';
import { Camera, Color, LerpFunc } from './simulation.js';
export declare abstract class SimulationElement {
    private pos;
    private color;
    camera: Camera | null;
    triangleCache: TriangleCache;
    constructor(pos: vec3, color?: Color);
    getPos(): vec3;
    setCamera(camera: Camera): void;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: vec3, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    abstract getBuffer(force: boolean): number[];
}
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    constructor(pos: vec3, width: number, height: number, color?: Color, rotation?: any);
    rotate(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: vec3, t?: number, f?: LerpFunc): Promise<void>;
    scaleWidth(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scaleHeight(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(_force: boolean): never[];
}
declare class TriangleCache {
    private static readonly BUF_LEN;
    private triangles;
    private hasUpdated;
    constructor();
    setCache(triangles: number[]): void;
    getCache(): number[];
    updated(): void;
    shouldUpdate(): boolean;
    getTriangleCount(): number;
}
export declare class Circle extends SimulationElement {
    private radius;
    constructor(pos: vec3, radius: number, color?: Color);
    setRadius(num: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): never[];
}
export declare class Polygon extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: vec3, points: vec3[], color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setPoints(newPoints: vec3[], t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): never[];
}
export declare class Line extends SimulationElement {
    private lineEl;
    constructor(pos1: vec3, pos2: vec3, thickness?: number, color?: Color);
    setLength(length: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setThickness(num: number, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    getBuffer(force: boolean): never[];
}
export declare class Plane extends SimulationElement {
    private vertices;
    private rotation;
    constructor(pos: vec3, vertices: vec3[], rotation?: any, color?: Color);
    getBuffer(_: boolean): number[];
}
export declare function vec3From(x?: number, y?: number, z?: number): any;
export declare function vec3ToPixelRatio(vec: vec3): void;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export {};
