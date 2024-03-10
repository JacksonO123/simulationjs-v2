/// <reference types="dist" />
import { vec2, vec3 } from 'wgpu-matrix';
import { SimulationElement } from './graphics.js';
export * from './graphics.js';
export type LerpFunc = (n: number) => number;
export declare const vertexSize = 40;
export declare const colorOffset = 16;
export declare const uvOffset = 32;
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
export declare class Camera {
    private pos;
    private rotation;
    private aspectRatio;
    private updated;
    private screenSize;
    constructor(pos: vec3, rotation?: vec3);
    setScreenSize(size: vec2): void;
    getScreenSize(): vec2;
    hasUpdated(): boolean;
    updateConsumed(): void;
    move(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: vec3, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(value: vec3, t?: number, f?: LerpFunc): Promise<void>;
    rotate(amount: vec3, t?: number, f?: LerpFunc): Promise<void>;
    getRotation(): vec3;
    getPos(): vec3;
    setAspectRatio(num: number): void;
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
    toObject(): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
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
