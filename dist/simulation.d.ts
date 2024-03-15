/// <reference types="dist" />
import { SimulationElement } from './graphics.js';
import type { Vector2, Vector3, LerpFunc } from './types.js';
export declare class Simulation {
    canvasRef: HTMLCanvasElement | null;
    private bgColor;
    private scene;
    private fittingElement;
    private running;
    private frameRateView;
    private camera;
    constructor(idOrCanvasRef: string | HTMLCanvasElement, camera?: Camera | null, showFrameRate?: boolean);
    add(el: SimulationElement): void;
    setCanvasSize(width: number, height: number): void;
    start(): void;
    stop(): void;
    setBackground(color: Color): void;
    render(device: GPUDevice, ctx: GPUCanvasContext): void;
    fitElement(): void;
    private assertHasCanvas;
}
export declare class SceneCollection extends SimulationElement {
    private name;
    private scene;
    constructor(name: string);
    getName(): string;
    add(el: SimulationElement): void;
    empty(): void;
    getBuffer(camera: Camera, force: boolean): number[];
}
export declare class Camera {
    private pos;
    private rotation;
    private aspectRatio;
    private updated;
    private screenSize;
    constructor(pos: Vector3, rotation?: Vector3);
    setScreenSize(size: Vector2): void;
    getScreenSize(): Vector2;
    hasUpdated(): boolean;
    updateConsumed(): void;
    move(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(value: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotate(amount: Vector3, t?: number, f?: LerpFunc): Promise<void>;
    getRotation(): Vector3;
    getPos(): Vector3;
    getAspectRatio(): number;
}
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    toBuffer(): readonly [number, number, number, number];
    toVec4(): import("./types.js").Vector4;
    toObject(): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    diff(color: Color): Color;
}
/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export declare function transitionValues(callback1: (deltaT: number, t: number) => void, callback2: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
export declare function lerp(a: number, b: number, t: number): number;
export declare function smoothStep(t: number): number;
export declare function linearStep(n: number): number;
