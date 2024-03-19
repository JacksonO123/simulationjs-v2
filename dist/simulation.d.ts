/// <reference types="dist" />
import { SimulationElement } from './graphics.js';
import type { Vector2, Vector3, LerpFunc } from './types.js';
import { Color } from './utils.js';
export declare class Simulation {
    canvasRef: HTMLCanvasElement | null;
    private bgColor;
    private scene;
    private fittingElement;
    private running;
    private frameRateView;
    private camera;
    constructor(idOrCanvasRef: string | HTMLCanvasElement, camera?: Camera | null, showFrameRate?: boolean);
    add(el: SimulationElement<any>): void;
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
    add(el: SimulationElement<any>): void;
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
