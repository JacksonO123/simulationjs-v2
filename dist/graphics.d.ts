import { vec3, vec2 } from 'wgpu-matrix';
import { Camera, Color, LerpFunc } from './simulation.js';
export type vec3 = [number, number, number];
declare class Vertex {
    private readonly pos;
    private readonly color;
    constructor(x?: number, y?: number, z?: number, color?: Color);
    getPos(): vec3;
    getColor(): Color | null;
}
export declare abstract class SimulationElement {
    private pos;
    private color;
    camera: Camera | null;
    triangleCache: TriangleCache;
    is3d: boolean;
    constructor(pos: vec3, color?: Color, is3d?: boolean);
    setPos(pos: vec3): void;
    getPos(): vec3;
    setCamera(camera: Camera): void;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: vec3, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    abstract getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Plane extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: vec3, points: Vertex[], rotation?: vec3, color?: Color);
    setPoints(newPoints: Vertex[]): void;
    rotate(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: vec3, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(_: Camera, force: boolean): number[];
}
type VertexColorMap = Record<0 | 1 | 2 | 3, Color>;
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    private vertexColors;
    /**
     * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
     */
    constructor(pos: vec2, width: number, height: number, color?: Color, rotation?: number, vertexColors?: VertexColorMap);
    scaleWidth(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scaleHeight(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    rotate(rotation: number, t?: number, f?: LerpFunc): Promise<void>;
    setRotation(): void;
    getBuffer(camera: Camera, force: boolean): number[];
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
export declare function vector3(x?: number, y?: number, z?: number): vec3;
export declare function vector2(x?: number, y?: number): vec2;
export declare function vec3ToPixelRatio(vec: vec3): void;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export declare function vertex(x?: number, y?: number, z?: number, color?: Color): Vertex;
export declare function color(r?: number, g?: number, b?: number, a?: number): Color;
export declare function colorf(val: number, a?: number): Color;
export {};
