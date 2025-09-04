import { CircleGeometryParams, CubeGeometryParams, EmptyParams, Spline2dGeometryParams, SquareGeometryParams, Vector3, LineGeometryParams, TraceLinesParams, LerpFunc } from './types.js';
import { CubicBezierCurve2d, SplinePoint2d } from './graphics.js';
export declare abstract class Geometry<T extends EmptyParams> {
    private subdivision;
    private subdivisionVertexLimit;
    private fromVertices;
    private currentInterpolate;
    private updated;
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected abstract params: T;
    protected vertices: Vector3[];
    protected topology: 'list' | 'strip';
    constructor(geometryType?: 'list' | 'strip');
    getTopology(): "list" | "strip";
    computeVertices(): void;
    compute(): void;
    triangulate(): void;
    setSubdivisions(num: number, vertexLimit?: number): void;
    clearSubdivisions(): void;
    setSubdivisionVertexLimit(limit: number): void;
    clearSubdivisionVertexLimit(): void;
    animateFrom(fromVertices: Vector3[], t: number, f?: LerpFunc): Promise<void>;
    getIndexes(wireframe: boolean): number[];
    getVertices(): Vector3[];
    hasUpdated(): boolean;
}
export declare class PlaneGeometry extends Geometry<EmptyParams> {
    protected params: {};
    constructor(vertices: Vector3[]);
    updateVertices(vertices: Vector3[]): void;
}
export declare class CubeGeometry extends Geometry<CubeGeometryParams> {
    protected params: CubeGeometryParams;
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    constructor(width: number, height: number, depth: number);
    setWidth(width: number): void;
    setHeight(height: number): void;
    setDepth(depth: number): void;
    computeVertices(): void;
    updateSize(width: number, height: number, depth: number): void;
}
export declare class SquareGeometry extends Geometry<SquareGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: SquareGeometryParams;
    constructor(width: number, height: number);
    setWidth(width: number): void;
    setHeight(height: number): void;
    computeVertices(): void;
}
export declare class BlankGeometry extends Geometry<EmptyParams> {
    protected params: {};
    constructor();
}
export declare class CircleGeometry extends Geometry<CircleGeometryParams> {
    protected params: CircleGeometryParams;
    constructor(radius: number, detail: number);
    setDetail(detail: number): void;
    getDetail(): number;
    setRadius(radius: number): void;
    getRadius(): number;
    computeVertices(): void;
}
export declare class OutlineCircleGeometry {
}
export declare class Spline2dGeometry extends Geometry<Spline2dGeometryParams> {
    protected params: Spline2dGeometryParams;
    constructor(points: SplinePoint2d[], thickness: number, detail: number);
    updateInterpolationStart(start: number): void;
    updateInterpolationLimit(limit: number): void;
    getInterpolationStart(): number;
    getInterpolationLimit(): number;
    getDistance(): number;
    updatePoint(pointIndex: number, newPoint: SplinePoint2d): void;
    updateThickness(thickness: number): void;
    getCurves(): CubicBezierCurve2d[];
    getVertexInterpolations(): number[];
    getCurveVertexIndices(): number[];
    private computeCurves;
    computeVertices(): void;
}
export declare class Line2dGeometry extends Geometry<LineGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: LineGeometryParams;
    constructor(pos: Vector3, to: Vector3, thickness: number);
    computeVertices(): void;
}
export declare class Line3dGeometry extends Geometry<LineGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: LineGeometryParams;
    constructor(pos: Vector3, to: Vector3, thickness: number);
    computeVertices(): void;
}
export declare class PolygonGeometry extends Geometry<EmptyParams> {
    protected params: {};
    constructor(vertices: Vector3[]);
    computeVertices(): void;
}
export declare class TraceLinesGeometry extends Geometry<TraceLinesParams> {
    protected params: TraceLinesParams;
    constructor(maxLen?: number);
    triangulate(): void;
    getVertexCount(): number;
    getOrder(_: boolean): readonly [Vector3[], number[]];
    addVertex(vert: Vector3): void;
    clear(): void;
}
