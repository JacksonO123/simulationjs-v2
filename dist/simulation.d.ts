/// <reference types="@webgpu/types" />
import { SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc, AnySimulationElement, BufferExtenderInfo, VertexParamInfo } from './types.js';
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
    add(el: AnySimulationElement, id?: string): void;
    remove(el: AnySimulationElement): void;
    removeId(id: string): void;
    /**
     * @param lifetime - ms
     */
    setLifetime(el: AnySimulationElement, lifetime: number): void;
    setCanvasSize(width: number, height: number): void;
    start(): void;
    private propagateDevice;
    stop(): void;
    setBackground(color: Color): void;
    getScene(): SimSceneObjInfo[];
    getSceneObjects(): AnySimulationElement[];
    private render;
    private renderScene;
    fitElement(): void;
}
export declare class SceneCollection extends SimulationElement3d {
    protected geometry: BlankGeometry;
    private name;
    private scene;
    protected device: GPUDevice | null;
    constructor(name?: string);
    setWireframe(_: boolean): void;
    getName(): string | null;
    getScene(): SimSceneObjInfo[];
    setDevice(device: GPUDevice): void;
    protected propagateDevice(device: GPUDevice): void;
    getVertexCount(): number;
    getSceneObjects(): AnySimulationElement[];
    setSceneObjects(newScene: AnySimulationElement[]): void;
    setScene(newScene: SimSceneObjInfo[]): void;
    add(el: AnySimulationElement, id?: string): void;
    remove(el: AnySimulationElement): void;
    removeId(id: string): void;
    /**
     * @param lifetime - ms
     */
    setLifetime(el: AnySimulationElement, lifetime: number): void;
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
export declare class ShaderGroup extends SceneCollection {
    protected geometry: BlankGeometry;
    private code;
    private module;
    private pipeline;
    private topology;
    private bufferExtender;
    private vertexParams;
    constructor(shaderCode: string, topology: GPUPrimitiveTopology | undefined, vertexParams: VertexParamInfo[], bufferExtender: BufferExtenderInfo);
    protected propagateDevice(device: GPUDevice): void;
    getPipeline(): GPURenderPipeline | null;
    protected updateMatrix(camera: Camera): void;
    getBufferExtender(): BufferExtenderInfo;
}
