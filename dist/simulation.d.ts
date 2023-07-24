/// <reference types="dist" />
export * from 'gl-matrix';
import { SimulationElement } from './graphics';
export * from './graphics';
export type LerpFunc = (n: number) => number;
export declare class Simulation {
    canvasRef: HTMLCanvasElement | null;
    private bgColor;
    private scene;
    private fittingElement;
    private running;
    constructor(idOrCanvasRef: string | HTMLCanvasElement);
    add(el: SimulationElement): void;
    setCanvasSize(width: number, height: number): void;
    start(): Promise<void>;
    stop(): void;
    setBackground(color: Color): void;
    render(device: GPUDevice, ctx: GPUCanvasContext): void;
    fitElement(): void;
    private assertHasCanvas;
}
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    toBuffer(): readonly [number, number, number, number];
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
