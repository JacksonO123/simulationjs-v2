import { VertexParamGeneratorInfo, CircleGeometryParams, CubeGeometryParams, EmptyParams, PolygonGeometryParams, Spline2dGeometryParams, SquareGeometryParams, Vector2, Vector3, VertexColorMap, LineGeometryParams, TraceLinesParams } from './types.js';
import { Color, Vertex } from './utils.js';
import { CubicBezierCurve2d, SplinePoint2d } from './graphics.js';
export declare abstract class Geometry<T extends EmptyParams> {
    protected abstract wireframeOrder: number[];
    protected abstract triangleOrder: number[];
    protected abstract params: T;
    protected vertices: Vector3[];
    protected geometryType: 'list' | 'strip';
    constructor(vertices?: Vector3[], geometryType?: 'list' | 'strip');
    getType(): "list" | "strip";
    abstract recompute(): void;
    getTriangleVertexCount(): number;
    getWireframeVertexCount(): number;
    protected bufferFromOrder(order: number[], color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    getWireframeBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    getTriangleBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare class PlaneGeometry extends Geometry<EmptyParams> {
    protected params: {};
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    private rawVertices;
    constructor(vertices: Vertex[]);
    recompute(): void;
    updateVertices(vertices: Vertex[]): void;
    getTriangleBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare class CubeGeometry extends Geometry<CubeGeometryParams> {
    protected params: CubeGeometryParams;
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    constructor(width: number, height: number, depth: number);
    setWidth(width: number): void;
    setHeight(height: number): void;
    setDepth(depth: number): void;
    recompute(): void;
    updateSize(width: number, height: number, depth: number): void;
}
export declare class SquareGeometry extends Geometry<SquareGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: SquareGeometryParams;
    constructor(width: number, height: number, centerOffset?: Vector2);
    setOffset(offset: Vector2): void;
    getOffset(): Vector2;
    setVertexColorMap(colorMap: VertexColorMap): void;
    setWidth(width: number): void;
    setHeight(height: number): void;
    recompute(): void;
    getTriangleBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare class BlankGeometry extends Geometry<EmptyParams> {
    protected wireframeOrder: never[];
    protected triangleOrder: never[];
    protected params: {};
    constructor();
    recompute(): void;
}
export declare class CircleGeometry extends Geometry<CircleGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: CircleGeometryParams;
    constructor(radius: number, detail: number);
    setRadius(radius: number): void;
    private updateWireframeOrder;
    private updateTriangleOrder;
    recompute(): void;
}
export declare class Spline2dGeometry extends Geometry<Spline2dGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: Spline2dGeometryParams;
    constructor(points: SplinePoint2d[], color: Color, thickness: number, detail: number);
    updateInterpolationStart(start: number): void;
    updateInterpolationLimit(limit: number): void;
    updatePoint(pointIndex: number, newPoint: SplinePoint2d): void;
    updateThickness(thickness: number): void;
    private getVertexCount;
    getWireframeVertexCount(): number;
    getTriangleVertexCount(): number;
    getCurves(): CubicBezierCurve2d[];
    private computeCurves;
    private updateWireframeOrder;
    recompute(): void;
    getWireframeBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    getTriangleBuffer(_: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare class Line2dGeometry extends Geometry<LineGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: LineGeometryParams;
    constructor(pos: Vector3, to: Vector3, thickness: number, fromColor?: Color | null, toColor?: Color | null);
    private generateBuffer;
    getTriangleBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    getWireframeBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    recompute(): void;
}
export declare class Line3dGeometry extends Geometry<LineGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: LineGeometryParams;
    constructor(pos: Vector3, to: Vector3, thickness: number, fromColor?: Color | null, toColor?: Color | null);
    private generateBuffer;
    getTriangleBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    getWireframeBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
    recompute(): void;
}
export declare class PolygonGeometry extends Geometry<PolygonGeometryParams> {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: PolygonGeometryParams;
    constructor(points: Vertex[]);
    recompute(): void;
    getTriangleBuffer(color: Color): number[];
}
export declare class TraceLines2dGeometry extends Geometry<EmptyParams> {
    protected wireframeOrder: never[];
    protected triangleOrder: never[];
    protected params: TraceLinesParams;
    constructor(maxLen?: number);
    recompute(): void;
    getWireframeBuffer(color: Color, vertexParamGenerator?: VertexParamGeneratorInfo | undefined): number[];
    getWireframeVertexCount(): number;
    addVertex(vert: Vertex): void;
}
