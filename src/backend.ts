import { MemoBuffer, WebGPUMemoBuffer } from './buffers.js';
import { logger } from './globals.js';
import { Instance, SimulationElement3d } from './graphics.js';
import {
    buildDepthTexture,
    buildMultisampleTexture,
    getVertexAndIndexSize
} from './internalUtils.js';
import { Shader } from './shaders/webgpu.js';
import { BackendType, Vector2 } from './types.js';
import { Color } from './utils.js';

type GPUBuffers<T> = {
    gpuVertexBuffer: MemoBuffer<T>;
    gpuIndexBuffer: MemoBuffer<T>;
};

export abstract class SimJsBackend {
    readonly type: BackendType;

    constructor(type: BackendType) {
        this.type = type;
    }
    async init(_canvas: HTMLCanvasElement) {}
    renderStart(_canvas: HTMLCanvasElement, _clearColor: Color) {}
    updateTextures(_screenSize: Vector2) {}
    preRender(_scene: SimulationElement3d[]) {}
    finishRender() {}
    draw(
        _obj: SimulationElement3d,

        _vertexOffset: number,
        _vertices: Float32Array,
        _vertexByteOffset: number,
        _vertexByteLength: number,

        _indexOffset: number,
        _indices: Uint32Array,
        _indexByteOffset: number,
        _indexByteLength: number
    ) {}
    initShaders(_shaders: Shader[]) {}
}

export class WebGPUBackend extends SimJsBackend {
    private device: GPUDevice | null = null;
    private ctx: GPUCanvasContext | null = null;
    private renderPassDescriptor: GPURenderPassDescriptor | null = null;
    private multisampleTexture: GPUTexture | null = null;
    private depthTexture: GPUTexture | null = null;
    private passEncoder: GPURenderPassEncoder | null = null;
    private commandEncoder: GPUCommandEncoder | null = null;
    private buffers: GPUBuffers<GPUBuffer> | null = null;

    constructor() {
        super('webgpu');
    }

    getDevice() {
        return this.device;
    }

    async init(canvas: HTMLCanvasElement) {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw logger.error('Adapter is null');

        this.ctx = canvas.getContext('webgpu');
        if (!this.ctx) throw logger.error('Context is null');

        this.device = await adapter.requestDevice();

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        this.ctx.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'opaque'
        });

        this.buffers = {
            gpuVertexBuffer: new WebGPUMemoBuffer(
                this.device,
                GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                0
            ),
            gpuIndexBuffer: new WebGPUMemoBuffer(
                this.device,
                GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                0
            )
        };
    }

    renderStart(canvas: HTMLCanvasElement, clearColor: Color) {
        if (!this.device || !this.ctx) throw logger.error('Invalid render start state');

        const colorAttachment: GPURenderPassColorAttachment = {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            view: undefined, // Assigned later

            clearValue: clearColor.toObject(),
            loadOp: 'clear',
            storeOp: 'store'
        };

        this.multisampleTexture = buildMultisampleTexture(
            this.device,
            this.ctx,
            canvas.width,
            canvas.height
        );
        this.depthTexture = buildDepthTexture(this.device, canvas.width, canvas.height);

        this.renderPassDescriptor = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        };
    }

    updateTextures(screenSize: Vector2) {
        if (!this.device || !this.ctx || !this.renderPassDescriptor) return;

        this.multisampleTexture = buildMultisampleTexture(
            this.device,
            this.ctx,
            screenSize[0],
            screenSize[1]
        );
        this.depthTexture = buildDepthTexture(this.device, screenSize[0], screenSize[1]);

        this.renderPassDescriptor.depthStencilAttachment!.view = this.depthTexture.createView();
    }

    preRender(scene: SimulationElement3d[]) {
        if (!this.renderPassDescriptor || !this.ctx || !this.multisampleTexture || !this.device) {
            throw logger.error('Invalid prerender state');
        }

        const attachment = (
            this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[]
        )[0] as GPURenderPassColorAttachment;

        attachment.view = this.multisampleTexture.createView();
        attachment.resolveTarget = this.ctx.getCurrentTexture().createView();

        this.commandEncoder = this.device.createCommandEncoder();
        this.passEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);

        const [totalVerticesSize, totalIndexSize] = getVertexAndIndexSize(scene);
        this.buffers!.gpuVertexBuffer.ensureCapacity(totalVerticesSize * 4);
        this.buffers!.gpuIndexBuffer.ensureCapacity(totalIndexSize * 4);
    }

    finishRender() {
        this.passEncoder!.end();
        this.device!.queue.submit([this.commandEncoder!.finish()]);
    }

    draw(
        obj: SimulationElement3d,

        vertexOffset: number,
        vertices: Float32Array,
        vertexByteOffset: number,
        vertexByteLength: number,

        indexOffset: number,
        indices: Uint32Array,
        indexByteOffset: number,
        indexByteLength: number
    ) {
        this.device!.queue.writeBuffer(
            this.buffers!.gpuVertexBuffer!.getBuffer(),
            vertexOffset,
            vertices.buffer,
            vertexByteOffset,
            vertexByteLength
        );

        this.device!.queue.writeBuffer(
            this.buffers!.gpuIndexBuffer.getBuffer(),
            indexOffset,
            indices.buffer,
            indexByteOffset,
            indexByteLength
        );

        this.passEncoder!.setVertexBuffer(
            0,
            this.buffers!.gpuVertexBuffer.getBuffer(),
            vertexOffset,
            vertexByteLength
        );
        this.passEncoder!.setIndexBuffer(
            this.buffers!.gpuIndexBuffer.getBuffer(),
            'uint32',
            indexOffset,
            indexByteLength
        );

        this.passEncoder!.setPipeline(obj.getPipeline());

        const shader = obj.getShader();
        shader.writeBuffers(this.device!, obj);
        const bindGroups = obj.getShader().getBindGroups(this.device!, obj);
        for (let i = 0; i < bindGroups.length; i++) {
            this.passEncoder!.setBindGroup(i, bindGroups[i]);
        }

        const instances = obj.isInstance
            ? (obj as Instance<SimulationElement3d>).getInstanceCount()
            : 1;
        this.passEncoder!.drawIndexed(indices.length, instances);
    }

    initShaders(shaders: Shader[]) {
        if (!this.device) throw logger.error('Device is null');
        for (let i = 0; i < shaders.length; i++) {
            shaders[i].init(this.device);
        }
    }
}

export class WebGLBackend extends SimJsBackend {
    constructor() {
        super('webgl');
    }
}
