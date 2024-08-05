/// <reference types="@webgpu/types" />
import { SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc, AnySimulationElement, VertexParamGeneratorInfo, VertexParamInfo, BindGroupInfo, ElementRotation } from './types.js';
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
    private resizeEvents;
    constructor(idOrCanvasRef: string | HTMLCanvasElement, camera?: Camera | null, showFrameRate?: boolean);
    private handleCanvasResize;
    onResize(cb: (width: number, height: number) => void): void;
    getWidth(): number;
    getHeight(): number;
    add(el: AnySimulationElement, id?: string): void;
    remove(el: AnySimulationElement): void;
    removeId(id: string): void;
    /**
     * @param lifetime - ms
     */
    setLifetime(el: AnySimulationElement, lifetime: number): void;
    private applyCanvasSize;
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
    protected scene: SimSceneObjInfo[];
    protected device: GPUDevice | null;
    constructor(name?: string);
    setWireframe(wireframe: boolean): void;
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
    getSceneBuffer(): (number | Float32Array)[];
    getWireframe(): (number | Float32Array)[];
    getTriangles(): (number | Float32Array)[];
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
    private bindGroupLayout;
    private topology;
    private paramGenerator;
    private vertexParams;
    private bindGroup;
    private valueBuffers;
    constructor(shaderCode: string, topology: GPUPrimitiveTopology | undefined, vertexParams: VertexParamInfo[], paramGenerator: VertexParamGeneratorInfo, bindGroup?: BindGroupInfo);
    protected propagateDevice(device: GPUDevice): void;
    getBindGroupLayout(): GPUBindGroupLayout | null;
    getPipeline(): GPURenderPipeline | null;
    getBindGroupBuffers(): GPUBuffer[] | null;
    private createBuffer;
    protected updateMatrix(camera: Camera): void;
    getVertexParamGenerator(): VertexParamGeneratorInfo;
    hasBindGroup(): boolean;
}
export declare class Group extends SceneCollection {
    constructor(name?: string);
    move(amount: Vector2 | Vector3, t?: number, f?: LerpFunc): Promise<void>;
    moveTo(pos: Vector2 | Vector3, t?: number, f?: LerpFunc): Promise<void>;
    rotate(amount: ElementRotation<Vector2 | Vector3>, t?: number, f?: LerpFunc): Promise<void>;
    rotateTo(rotation: ElementRotation<Vector2 | Vector3>, t?: number, f?: LerpFunc): Promise<void>;
    fill(newColor: Color, t?: number, f?: LerpFunc | undefined): Promise<void>;
    private loopElements;
}
