import { Camera } from './simulation.js';
import type { Vector2, Vector3, LerpFunc, VertexColorMap } from './types.js';
import { Vertex, VertexCache, Color } from './utils.js';
export declare abstract class SimulationElement<T extends Vector2 | Vector3 = Vector3> {
    private pos;
    private color;
    camera: Camera | null;
    vertexCache: VertexCache;
    is3d: boolean;
    constructor(pos: T, color?: Color, is3d?: boolean);
    setPos(pos: T): void;
    getPos(): T;
    setCamera(camera: Camera): void;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    getColor(): Color;
    move(amount: T, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: T, t?: number, f?: LerpFunc): Promise<void>;
    abstract getBuffer(camera: Camera, force: boolean): number[];
}
export declare abstract class SimulationElement3d extends SimulationElement {
    rotation: Vector3;
    private wireframe;
    protected wireframeCache: VertexCache;
    constructor(pos: Vector3, rotation?: Vector3, color?: Color);
    setWireframe(wireframe: boolean): void;
    isWireframe(): boolean;
    rotate(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    setRotation(rot: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    protected wireframeFromVertexOrder(vertices: Vector3[], order: number[]): number[];
    abstract getWireframe(camera: Camera, force: boolean): number[];
    abstract getTriangles(camera: Camera, force: boolean): number[];
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare abstract class SimulationElement2d extends SimulationElement<Vector2> {
    rotation: number;
    constructor(pos: Vector2, rotation?: number, color?: Color);
    rotate(rotation: number, t?: number, f?: LerpFunc): Promise<void>;
    setRotation(newRotation: number, t?: number, f?: LerpFunc): Promise<void>;
}
export declare class Plane extends SimulationElement3d {
    private points;
    constructor(pos: Vector3, points: Vertex[], color?: Color, rotation?: Vector3);
    setPoints(newPoints: Vertex[]): void;
    getWireframe(_: Camera, force: boolean): number[];
    getTriangles(_: Camera, force: boolean): number[];
}
export declare class Square extends SimulationElement2d {
    private width;
    private height;
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
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Circle extends SimulationElement2d {
    private radius;
    private detail;
    constructor(pos: Vector2, radius: number, color?: Color, detail?: number);
    setRadius(num: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Polygon extends SimulationElement2d {
    private vertices;
    constructor(pos: Vector2, vertices: Vertex[], color?: Color, rotation?: number);
    getVertices(): Vertex[];
    setVertices(newVertices: Vertex[], t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Line3d extends SimulationElement3d {
    private to;
    private toColor;
    private thickness;
    constructor(pos: Vertex, to: Vertex, thickness: number);
    setStart(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    setEnd(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    getWireframe(_: Camera, force: boolean): number[];
    getTriangles(_: Camera, force: boolean): number[];
}
export declare class Line2d extends SimulationElement {
    private to;
    private toColor;
    private thickness;
    constructor(from: Vertex, to: Vertex, thickness?: number);
    setEndColor(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    setStart(pos: Vector2, t?: number, f?: LerpFunc): Promise<void>;
    setEnd(pos: Vector2, t?: number, f?: LerpFunc): Promise<void>;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Cube extends SimulationElement3d {
    private vertices;
    private width;
    private height;
    private depth;
    private wireframeLines;
    private static readonly wireframeOrder;
    constructor(pos: Vector3, width: number, height: number, depth: number, color?: Color, rotation?: Vector3);
    private computeVertices;
    private shiftWireframeLines;
    setWidth(width: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(height: number, t?: number, f?: LerpFunc): Promise<void>;
    setDepth(depth: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    getWireframe(_: Camera, force: boolean): number[];
    getTriangles(_: Camera, force: boolean): number[];
}
export declare class BezierCurve2d {
    private points;
    constructor(points: Vector2[]);
    interpolateSlope(t: number): readonly [Vector2, Vector2];
    interpolate(t: number): Vector2;
    getPoints(): Vector2[];
    getLength(): number;
}
export declare class CubicBezierCurve2d extends BezierCurve2d {
    private detail;
    private colors;
    constructor(points: [Vector2, Vector2, Vector2, Vector2], detail?: number, colors?: (Color | null)[]);
    getDetail(): number | undefined;
    getColors(): (Color | null)[];
}
export declare class SplinePoint2d {
    private start;
    private end;
    private control1;
    private control2;
    private rawControls;
    private detail;
    constructor(start: Vertex | null, end: Vertex, control1: Vector2 | null, control2: Vector2, rawControls: [Vector2, Vector2], detail?: number);
    getStart(): Vertex | null;
    getEnd(): Vertex;
    getControls(): readonly [Vector2 | null, Vector2];
    getRawControls(): [Vector2, Vector2];
    getDetail(): number | undefined;
    getColors(prevColor?: Color | null): (Color | null)[];
    getVectorArray(prevEnd: Vector2 | null, prevControl: Vector2 | null): readonly [Vector2, Vector2, Vector2, Vector2];
}
export declare class Spline2d extends SimulationElement {
    private curves;
    private thickness;
    private detail;
    private interpolateStart;
    private interpolateLimit;
    private distance;
    constructor(pos: Vertex, points: SplinePoint2d[], thickness?: number, detail?: number);
    setInterpolateStart(start: number, t?: number, f?: LerpFunc): Promise<void>;
    setInterpolateLimit(limit: number, t?: number, f?: LerpFunc): Promise<void>;
    interpolateSlope(t: number): readonly [Vector2, Vector2];
    interpolate(t: number): Vector2;
    getBuffer(camera: Camera, force: boolean): number[];
}
