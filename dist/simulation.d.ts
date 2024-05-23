/// <reference types="@webgpu/types" />
import { SimulationElement, SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc } from './types.js';
import { Color } from './utils.js';
import { BlankGeometry } from './geometry.js';
import { SimSceneObjInfo } from './internalUtils.js';
export declare class Simulation {
    canvasRef: HTMLCanvasElement | null;
    private bgColor;
    private scene;
    private fittingElement;
    private running;
    private initialized;
    private frameRateView;
    private camera;
    private device;
    private pipelines;
    private renderInfo;
    constructor(idOrCanvasRef: string | HTMLCanvasElement, camera?: Camera | null, showFrameRate?: boolean);
    add(el: SimulationElement<any>, id?: string): void;
    remove(el: SimulationElement<any>): void;
    removeId(id: string): void;
    /**
     * @param lifetime - ms
     */
    setLifetime(el: SimulationElement<any>, lifetime: number): void;
    setCanvasSize(width: number, height: number): void;
    start(): void;
    private propagateDevice;
    stop(): void;
    setBackground(color: Color): void;
    getScene(): SimSceneObjInfo[];
    getSceneObjects(): SimulationElement<Vector3 | Vector2>[];
    private render;
    private renderScene;
    fitElement(): void;
}
export declare class SceneCollection extends SimulationElement3d {
    protected geometry: BlankGeometry;
    private name;
    private scene;
    private device;
    constructor(name: string);
    setWireframe(_: boolean): void;
    getName(): string;
    getScene(): SimSceneObjInfo[];
    setDevice(device: GPUDevice): void;
    private propagateDevice;
    getVertexCount(): number;
    getSceneObjects(): SimulationElement<Vector3 | Vector2>[];
    setSceneObjects(newScene: SimulationElement<any>[]): void;
    setScene(newScene: SimSceneObjInfo[]): void;
    add(el: SimulationElement<any>, id?: string): void;
    remove(el: SimulationElement<any>): void;
    removeId(id: string): void;
    /**
     * @param lifetime - ms
     */
    setLifetime(el: SimulationElement<any>, lifetime: number): void;
    empty(): void;
    getSceneBuffer(camera: Camera): number[];
    getWireframe(camera: Camera): number[];
    getTriangles(camera: Camera): number[];
    protected updateMatrix(camera: Camera): void;
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
