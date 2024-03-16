import { Camera } from './simulation.js';
import type { Vector2, Vector3, LerpFunc, VertexColorMap } from './types.js';
import { Vertex, VertexCache, Color } from './utils.js';
export declare abstract class SimulationElement {
    private pos;
    private color;
    camera: Camera | null;
    vertexCache: VertexCache;
    constructor(pos: Vector3, color?: Color);
    setPos(pos: Vector3): void;
    getPos(): Vector3;
    setCamera(camera: Camera): void;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    abstract getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Plane extends SimulationElement {
    private points;
    private rotation;
    constructor(pos: Vector3, points: Vertex[], color?: Color, rotation?: Vector3);
    setPoints(newPoints: Vertex[]): void;
    rotate(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(angle: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(_: Camera, force: boolean): number[];
}
export declare class Square extends SimulationElement {
    private width;
    private height;
    private rotation;
    private vertexColors;
    private points;
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
    setRotation(newRotation: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
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
    private vertices;
    private rotation;
    constructor(pos: Vector3, vertices: Vertex[], color?: Color);
    rotate(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(num: number, t?: number, f?: LerpFunc): Promise<void>;
    getVertices(): Vertex[];
    setVertices(newVertices: Vertex[], t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class BezierCurve2d {
    private points;
    constructor(points: Vector2[]);
    interpolateSlope(t: number): readonly [Vector2, Vector2];
    interpolate(t: number): Vector2;
    getPoints(): Vector2[];
}
export declare class CubicBezierCurve2d extends BezierCurve2d {
    constructor(points: [Vector2, Vector2, Vector2, Vector2]);
}
export declare class SplinePoint2d {
    private start;
    private end;
    private controls;
    constructor(start: Vertex | null, end: Vertex, controls: [Vector2, Vector2]);
    getStart(): Vertex | null;
    getEnd(): Vertex;
    getVectorArray(prevEnd?: Vector2): readonly [Vector2, Vector2, Vector2, Vector2];
}
export declare class Spline2d extends SimulationElement {
    private curves;
    private width;
    private detail;
    constructor(pos: Vector2, points: SplinePoint2d[], width?: number, color?: Color, detail?: number);
    getBuffer(camera: Camera, force: boolean): number[];
}
