import { CircleGeometryParams, CubeGeometryParams, Line2dGeometryParams, Line3dGeometryParams, Mat4, PolygonGeometryParams, SplineGeometryParams, SquareGeometryParams, Vector2, Vector3, VertexColorMap } from './types.js';
import { Color, Vertex } from './utils.js';
import { SplinePoint2d } from './graphics.js';
export declare abstract class Geometry {
    protected abstract wireframeOrder: number[];
    protected abstract triangleOrder: number[];
    protected abstract params: Record<string, any>;
    protected vertices: Vector3[];
    protected matrix: Mat4;
    protected geometryType: 'list' | 'strip';
    constructor(vertices?: Vector3[], geometryType?: 'list' | 'strip');
    updateMatrix(matrix: Mat4): void;
    getType(): "list" | "strip";
    abstract recompute(): void;
    protected bufferFromOrder(order: number[], color: Color): number[];
    getWireframeBuffer(color: Color): number[];
    getTriangleBuffer(color: Color): number[];
}
export declare class PlaneGeometry extends Geometry {
    protected params: {};
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    private rawVertices;
    constructor(vertices: Vertex[]);
    private updateWireframeOrder;
    recompute(): void;
    updateVertices(vertices: Vertex[]): void;
    getTriangleBuffer(color: Color): number[];
}
export declare class CubeGeometry extends Geometry {
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
export declare class SquareGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: SquareGeometryParams;
    constructor(width: number, height: number);
    setVertexColorMap(colorMap: VertexColorMap): void;
    setWidth(width: number): void;
    setHeight(height: number): void;
    recompute(): void;
    getTriangleBuffer(color: Color): number[];
}
export declare class BlankGeometry extends Geometry {
    protected wireframeOrder: never[];
    protected triangleOrder: never[];
    protected params: {};
    constructor();
    recompute(): void;
}
export declare class CircleGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: CircleGeometryParams;
    constructor(radius: number, detail: number);
    setRadius(radius: number): void;
    private updateWireframeOrder;
    private updateTriangleOrder;
    recompute(): void;
}
export declare class SplineGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: SplineGeometryParams;
    constructor(points: SplinePoint2d[], color: Color, thickness: number, detail: number);
    updateInterpolationStart(start: number): void;
    updateInterpolationLimit(limit: number): void;
    private computeCurves;
    private updateWireframeOrder;
    recompute(): void;
    getWireframeBuffer(color: Color): number[];
    getTriangleBuffer(_: Color): number[];
}
export declare class Line2dGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: Line2dGeometryParams;
    constructor(pos: Vector2, to: Vector2, thickness: number);
    recompute(): void;
}
export declare class Line3dGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: Line3dGeometryParams;
    constructor(pos: Vector3, to: Vector3, thickness: number);
    recompute(): void;
}
export declare class PolygonGeometry extends Geometry {
    protected wireframeOrder: number[];
    protected triangleOrder: number[];
    protected params: PolygonGeometryParams;
    constructor(points: Vertex[]);
    recompute(): void;
    getTriangleBuffer(color: Color): number[];
}
