/// <reference types="@webgpu/types" />
import { EmptyElement, SimulationElement } from './graphics.js';
import type { Vector2, Vector3, LerpFunc, AnySimulationElement, VertexParamGeneratorInfo, VertexParamInfo, BindGroupInfo } from './types.js';
import { Color } from './utils.js';
import { SimSceneObjInfo } from './internalUtils.js';
import { Settings } from './settings.js';
export declare class Simulation extends Settings {
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
    remove(el: SimulationElement): void;
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
    getSceneObjects(): SimulationElement[];
    private render;
    private renderScene;
    fitElement(): void;
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
export declare class ShaderGroup extends EmptyElement {
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
    protected onDeviceChange(device: GPUDevice): void;
    getBindGroupLayout(): GPUBindGroupLayout | null;
    getPipeline(): GPURenderPipeline | null;
    getBindGroupBuffers(device: GPUDevice): GPUBuffer[] | null;
    private createBuffer;
    getVertexParamGenerator(): VertexParamGeneratorInfo;
    hasBindGroup(): boolean;
}
