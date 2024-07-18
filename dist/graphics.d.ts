/// <reference types="@webgpu/types" />
import { Camera } from './simulation.js';
import type { Vector2, Vector3, LerpFunc, VertexColorMap, ElementRotation, Mat4, AnySimulationElement, VertexParamGeneratorInfo } from './types.js';
import { Vertex, Color } from './utils.js';
import { BlankGeometry, CircleGeometry, CubeGeometry, Geometry, Line2dGeometry, Line3dGeometry, PlaneGeometry, PolygonGeometry, Spline2dGeometry, SquareGeometry } from './geometry.js';
import { VertexCache } from './internalUtils.js';
export declare abstract class SimulationElement<T extends Vector2 | Vector3 = Vector3> {
    protected abstract pos: T;
    protected abstract geometry: Geometry<any>;
    protected color: Color;
    protected wireframe: boolean;
    protected vertexCache: VertexCache;
    protected rotation: ElementRotation<T>;
    isInstanced: boolean;
    /**
     * @param pos - Expected to be adjusted to devicePixelRatio before reaching constructor
     */
    constructor(color: Color | undefined, rotation: ElementRotation<T>);
    getGeometryType(): "list" | "strip";
    setWireframe(wireframe: boolean): void;
    isWireframe(): boolean;
    getColor(): Color;
    getPos(): T;
    getRotation(): ElementRotation<T>;
    fill(newColor: Color, t?: number, f?: LerpFunc): Promise<void>;
    abstract move(amount: T, t?: number, f?: LerpFunc): Promise<void>;
    abstract moveTo(pos: T, t?: number, f?: LerpFunc): Promise<void>;
    abstract rotate(amount: ElementRotation<T>, t?: number, f?: LerpFunc): Promise<void>;
    abstract rotateTo(rotation: ElementRotation<T>, t?: number, f?: LerpFunc): Promise<void>;
    protected abstract updateMatrix(camera: Camera): void;
    getVertexCount(): number;
    protected defaultUpdateMatrix(camera: Camera): void;
    getBuffer(camera: Camera, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare abstract class SimulationElement3d extends SimulationElement {
    protected pos: Vector3;
    protected rotation: Vector3;
    is3d: boolean;
    constructor(pos: Vector3, rotation?: Vector3, color?: Color);
    rotate(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(rot: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    move(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
}
export declare abstract class SimulationElement2d extends SimulationElement<Vector2> {
    protected pos: Vector2;
    rotation: number;
    constructor(pos: Vector2, rotation?: number, color?: Color);
    rotate(rotation: number, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(newRotation: number, t?: number, f?: LerpFunc): Promise<void>;
    move(amount: Vector2, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(newPos: Vector2, t?: number, f?: LerpFunc): Promise<void>;
}
export declare class Plane extends SimulationElement3d {
    protected geometry: PlaneGeometry;
    points: Vertex[];
    constructor(pos: Vector3, points: Vertex[], color?: Color, rotation?: Vector3);
    setPoints(newPoints: Vertex[]): void;
    protected updateMatrix(camera: Camera): void;
}
export declare class Square extends SimulationElement2d {
    protected geometry: SquareGeometry;
    private width;
    private height;
    private vertexColors;
    /**
     * @param centerOffset{Vector2} - A vector2 of values from 0 to 1
     * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
     */
    constructor(pos: Vector2, width: number, height: number, color?: Color, rotation?: number, centerOffset?: Vector2, vertexColors?: VertexColorMap);
    private cloneColorMap;
    setVertexColors(newColorMap: VertexColorMap, t?: number, f?: LerpFunc): Promise<void>;
    scaleWidth(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scaleHeight(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    setWidth(num: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(num: number, t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class Circle extends SimulationElement2d {
    protected geometry: CircleGeometry;
    private radius;
    private detail;
    constructor(pos: Vector2, radius: number, color?: Color, detail?: number);
    setRadius(num: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class Polygon extends SimulationElement2d {
    protected geometry: PolygonGeometry;
    private vertices;
    constructor(pos: Vector2, points: Vertex[], color?: Color, rotation?: number);
    getVertices(): Vertex[];
    setVertices(newVertices: Vertex[], t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class Line3d extends SimulationElement3d {
    protected geometry: Line3dGeometry;
    private to;
    private thickness;
    constructor(pos: Vertex, to: Vertex, thickness: number);
    setStart(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    setEnd(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class Line2d extends SimulationElement2d {
    protected geometry: Line2dGeometry;
    private to;
    private thickness;
    constructor(from: Vertex, to: Vertex, thickness?: number);
    setStart(pos: Vector2, t?: number, f?: LerpFunc): Promise<void>;
    setEnd(pos: Vector2, t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class Cube extends SimulationElement3d {
    protected geometry: CubeGeometry;
    private width;
    private height;
    private depth;
    constructor(pos: Vector3, width: number, height: number, depth: number, color?: Color, rotation?: Vector3);
    setWidth(width: number, t?: number, f?: LerpFunc): Promise<void>;
    setHeight(height: number, t?: number, f?: LerpFunc): Promise<void>;
    setDepth(depth: number, t?: number, f?: LerpFunc): Promise<void>;
    scale(amount: number, t?: number, f?: LerpFunc): Promise<void>;
    protected updateMatrix(camera: Camera): void;
}
export declare class BezierCurve2d {
    private points;
    private length;
    constructor(points: Vector2[]);
    interpolateSlope(t: number): readonly [Vector2, Vector2];
    interpolate(t: number): Vector2;
    getPoints(): Vector2[];
    estimateLength(detail: number): number;
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
    clone(): SplinePoint2d;
}
export declare class Spline2d extends SimulationElement2d {
    protected geometry: Spline2dGeometry;
    private thickness;
    private detail;
    private interpolateStart;
    private interpolateLimit;
    private length;
    constructor(pos: Vertex, points: SplinePoint2d[], thickness?: number, detail?: number);
    private estimateLength;
    getLength(): number;
    setInterpolateStart(start: number, t?: number, f?: LerpFunc): Promise<void>;
    setInterpolateLimit(limit: number, t?: number, f?: LerpFunc): Promise<void>;
    updatePoint(pointIndex: number, newPoint: SplinePoint2d): void;
    updatePointAbsolute(pointIndex: number, newPoint: SplinePoint2d): void;
    setThickness(thickness: number, t?: number, f?: LerpFunc): Promise<void>;
    interpolateSlope(t: number): Vector2[] | readonly [Vector2, Vector2];
    interpolate(t: number): Vector2;
    protected updateMatrix(camera: Camera): void;
}
export declare class Instance<T extends AnySimulationElement> extends SimulationElement3d {
    protected geometry: BlankGeometry;
    private obj;
    private instanceMatrix;
    private matrixBuffer;
    private device;
    private baseMat;
    private needsRemap;
    constructor(obj: T, numInstances: number);
    setNumInstances(numInstances: number): void;
    setInstance(instance: number, transformation: Mat4): void;
    private mapBuffer;
    private setMatrixBuffer;
    getInstances(): Mat4[];
    getNumInstances(): number;
    setDevice(device: GPUDevice): void;
    getMatrixBuffer(): GPUBuffer | null;
    getVertexCount(): number;
    getGeometryType(): "list" | "strip";
    protected updateMatrix(_: Camera): void;
    getBuffer(camera: Camera): number[];
}
