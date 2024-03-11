import { Camera, Color, LerpFunc } from './simulation.js';
import type { Vector2, Vector3 } from './types.js';
declare class Vertex {
    private readonly pos;
    private readonly color;
    constructor(x?: number, y?: number, z?: number, color?: Color);
    getPos(): Vector3;
    getColor(): Color;
    toBuffer(): number[];
}
export declare abstract class SimulationElement {
    private pos;
    private color;
    camera: Camera | null;
    triangleCache: VertexCache;
    is3d: boolean;
    constructor(pos: Vector3, color?: Color, is3d?: boolean);
    setPos(pos: Vector3): void;
    getPos(): Vector3;
    setCamera(camera: Camera): void;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    getTriangleCount(): number;
    abstract getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Plane extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: Vector3, points: Vertex[], rotation?: Vector3, color?: Color);
    setPoints(newPoints: Vertex[]): void;
    rotate(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: Vector3, t?: number, f?: LerpFunc): Promise<void>;
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
    constructor(pos: Vector2, width: number, height: number, color?: Color, rotation?: number, vertexColors?: VertexColorMap);
    scaleWidth(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scaleHeight(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    rotate(rotation: number, t?: number, f?: LerpFunc): Promise<void>;
    setRotation(): void;
    getBuffer(camera: Camera, force: boolean): number[];
}
declare class VertexCache {
    private static readonly BUF_LEN;
    private vertices;
    private hasUpdated;
    constructor();
    setCache(vertices: number[]): void;
    getCache(): number[];
    updated(): void;
    shouldUpdate(): boolean;
    getVertexCount(): number;
}
export declare class Circle extends SimulationElement {
    private radius;
    private detail;
    constructor(pos: Vector2, radius: number, color?: Color, detail?: number);
    setRadius(num: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Polygon extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: Vector3, points: Vector3[], color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setPoints(newPoints: Vector3[], t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(): never[];
}
export declare function vector3(x?: number, y?: number, z?: number): Vector3;
export declare function vector2(x?: number, y?: number): Vector2;
export declare function vec3fromVec2(vec: Vector2): Vector3;
export declare function vec3ToPixelRatio(vec: Vector3): void;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export declare function vertex(x?: number, y?: number, z?: number, color?: Color): Vertex;
export declare function color(r?: number, g?: number, b?: number, a?: number): Color;
export declare function colorf(val: number, a?: number): Color;
export {};
