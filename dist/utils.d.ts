import { SimulationElement, SplinePoint2d } from './graphics.js';
import { FloatArray, Mat4, Shift, Vector2, Vector3, Vector4 } from './types.js';
import { SimSceneObjInfo } from './internalUtils.js';
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    toBuffer(): readonly [number, number, number, number];
    toVec4(): Vector4;
    toObject(): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    diff(color: Color): Color;
}
export declare class Vertex {
    private pos;
    private color;
    private is3d;
    private uv;
    constructor(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2);
    getPos(): Vector3;
    setPos(pos: Vector3): void;
    getColor(): Color | null;
    setColor(color: Color): void;
    getUv(): Vector2;
    setUv(uv: Vector2): void;
    setX(x: number): void;
    setY(y: number): void;
    setZ(z: number): void;
    setIs3d(is3d: boolean): void;
    clone(): Vertex;
    toBuffer(defaultColor: Color): number[];
}
/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export declare function transitionValues(callback1: (deltaT: number, t: number) => void, callback2: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
export declare function frameLoop<T extends (...args: any[]) => any>(cb: T): (...params: Shift<Parameters<T>>) => void;
export declare function lerp(a: number, b: number, t: number): number;
export declare function smoothStep(t: number): number;
export declare function linearStep(t: number): number;
export declare function easeInOutExpo(t: number): number;
export declare function easeInOutQuart(t: number): number;
export declare function easeInOutQuad(t: number): number;
export declare function easeInQuad(x: number): number;
export declare function easeOutQuad(x: number): number;
export declare function easeInQuart(x: number): number;
export declare function easeOutQuart(x: number): number;
export declare function easeInExpo(x: number): number;
export declare function easeOutExpo(x: number): number;
export declare function cloneBuf<T extends FloatArray>(buf: T): T;
export declare function vector4(x?: number, y?: number, z?: number, w?: number): Vector4;
export declare function vector3(x?: number, y?: number, z?: number): Vector3;
export declare function vector2(x?: number, y?: number): Vector2;
export declare function matrix4(): Mat4;
export declare function vector3FromVector2(vec: Vector2): Vector3;
export declare function vector2FromVector3(vec: Vector3): Vector2;
export declare function colorFromVector4(vec: Vector4): Color;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export declare function vertex(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2): Vertex;
export declare function color(r?: number, g?: number, b?: number, a?: number): Color;
export declare function colorf(val: number, a?: number): Color;
export declare function splinePoint2d(end: Vertex, control1: Vector2, control2: Vector2, detail?: number): SplinePoint2d;
export declare function continuousSplinePoint2d(end: Vertex, control: Vector2, detail?: number): SplinePoint2d;
/**
 * @param t - seconds
 */
export declare function waitFor(t: number): Promise<unknown>;
export declare function distance2d(vector1: Vector2, vector2: Vector2): number;
export declare function distance3d(vector1: Vector3, vector2: Vector3): number;
export declare function toSceneObjInfo(el: SimulationElement<any>, id?: string): SimSceneObjInfo;
export declare function toSceneObjInfoMany(el: SimulationElement<any>[], id?: (string | undefined)[]): SimSceneObjInfo[];
