import { logger } from '../globals.js';
import { SimulationElement3d } from '../graphics.js';
import { SimJSShader } from '../shaders/shader.js';
import { BackendType, GPUBuffers, SpecificBackendType, Vector2 } from '../types.js';
import { color, Color } from '../utils.js';

export abstract class SimJsBackend {
    private type: BackendType;
    protected abstract buffers: GPUBuffers<unknown> | null;
    protected clearColor: Color = color();

    constructor(type: BackendType) {
        this.type = type;
    }

    getBackendType() {
        return this.type;
    }

    abstract init(canvas: HTMLCanvasElement): Promise<void>;
    abstract renderStart(canvas: HTMLCanvasElement): void;
    abstract updateTextures(screenSize: Vector2): void;
    abstract preRender(scene: SimulationElement3d[]): void;
    abstract finishRender(): void;
    abstract draw(
        obj: SimulationElement3d,

        vertexCallOffset: number,
        vertexCallBuffer: Float32Array,

        indexOffset: number,
        indices: Uint32Array
    ): void;
    abstract initShaders(shaders: SimJSShader[]): void;
    abstract destroy(): void;
    abstract onClearColorChange(): void;

    setClearColor(color: Color) {
        this.clearColor = color;
        this.onClearColorChange();
    }

    as<T extends BackendType>(type: T): SpecificBackendType<T> {
        if (this.type !== type) throw logger.error('Incompatible backend cast');
        return this as unknown as SpecificBackendType<T>;
    }
}
