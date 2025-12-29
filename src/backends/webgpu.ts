import { WebGPUMemoBuffer } from '../buffers/webgpu.js';
import { logger } from '../globals.js';
import { Instance, SimulationElement3d } from '../graphics.js';
import {
    buildDepthTexture,
    buildMultisampleTexture,
    getVertexAndIndexSize
} from '../internalUtils.js';
import { SimJSShader } from '../shaders/shader.js';
import { GPUBuffers, Vector2 } from '../types.js';
import { SimJsBackend } from './backend.js';

export class WebGPUBackend extends SimJsBackend {
    private device: GPUDevice | null = null;
    private ctx: GPUCanvasContext | null = null;
    private renderPassDescriptor: GPURenderPassDescriptor | null = null;
    private multisampleTexture: GPUTexture | null = null;
    private depthTexture: GPUTexture | null = null;
    private passEncoder: GPURenderPassEncoder | null = null;
    private commandEncoder: GPUCommandEncoder | null = null;
    protected buffers: GPUBuffers<'webgpu'> | null = null;

    constructor() {
        super('webgpu');
    }

    getDeviceOrError() {
        if (!this.device) throw logger.error('Backend not initialized');
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
            gpuVertexCallBuffer: new WebGPUMemoBuffer(
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

    renderStart(canvas: HTMLCanvasElement) {
        if (!this.device || !this.ctx) throw logger.error('Invalid render start state');

        const colorAttachment: GPURenderPassColorAttachment = {
            // @ts-ignore
            view: undefined, // Assigned later

            clearValue: this.clearColor.toObject(),
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

    destroy() {
        this.device?.destroy();
        this.multisampleTexture?.destroy();
        this.depthTexture?.destroy();
        this.buffers?.gpuVertexCallBuffer.destroy();
        this.buffers?.gpuIndexBuffer.destroy();
    }

    updateTextures(screenSize: Vector2) {
        if (!this.device || !this.ctx || !this.renderPassDescriptor) {
            throw logger.error('Invalid update texture state');
        }

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

        const colorAttachments = this.renderPassDescriptor
            .colorAttachments as GPURenderPassColorAttachment[];
        const attachment = colorAttachments[0] as GPURenderPassColorAttachment;

        attachment.view = this.multisampleTexture.createView();
        attachment.resolveTarget = this.ctx.getCurrentTexture().createView();

        this.commandEncoder = this.device.createCommandEncoder();
        this.passEncoder = this.commandEncoder.beginRenderPass(this.renderPassDescriptor);

        const [totalVerticesSize, totalIndexSize] = getVertexAndIndexSize(scene);
        this.buffers!.gpuVertexCallBuffer.ensureCapacity(totalVerticesSize * 4);
        this.buffers!.gpuIndexBuffer.ensureCapacity(totalIndexSize * 4);
    }

    finishRender() {
        this.passEncoder!.end();
        this.device!.queue.submit([this.commandEncoder!.finish()]);
    }

    draw(
        obj: SimulationElement3d,

        vertexCallOffset: number,
        vertexCallBuffer: Float32Array,

        indexOffset: number,
        indices: Uint32Array
    ) {
        if (!this.device || !this.buffers || !this.passEncoder) {
            throw logger.error('Invalid draw state');
        }

        this.device.queue.writeBuffer(
            this.buffers.gpuVertexCallBuffer.getBuffer(),
            vertexCallOffset,
            vertexCallBuffer.buffer,
            vertexCallBuffer.byteOffset,
            vertexCallBuffer.byteLength
        );

        this.device.queue.writeBuffer(
            this.buffers.gpuIndexBuffer.getBuffer(),
            indexOffset,
            indices.buffer,
            indices.byteOffset,
            indices.byteLength
        );

        this.passEncoder.setVertexBuffer(
            0,
            this.buffers.gpuVertexCallBuffer.getBuffer(),
            vertexCallOffset,
            vertexCallBuffer.byteLength
        );
        this.passEncoder.setIndexBuffer(
            this.buffers.gpuIndexBuffer.getBuffer(),
            'uint32',
            indexOffset,
            indices.byteLength
        );

        this.passEncoder.setPipeline(obj.getPipeline());

        const shader = obj.getShader().as('webgpu');
        shader.writeUniformBuffers(obj);
        const bindGroups = shader.getBindGroups(this.device, obj);
        for (let i = 0; i < bindGroups.length; i++) {
            this.passEncoder.setBindGroup(i, bindGroups[i]);
        }

        const instances = obj.isInstance
            ? (obj as Instance<SimulationElement3d>).getInstanceCount()
            : 1;
        this.passEncoder.drawIndexed(indices.length, instances);
    }

    initShaders(shaders: SimJSShader[]) {
        if (!this.device) throw logger.error('WebGPU device is null');
        for (let i = 0; i < shaders.length; i++) {
            const shader = shaders[i];
            if (shader.compatableWith('webgpu')) {
                shader.as('webgpu').init(this.device);
            }
        }
    }

    onClearColorChange() {
        if (!this.renderPassDescriptor) return;
        const colorAttachments = this.renderPassDescriptor
            .colorAttachments as GPURenderPassColorAttachment[];
        colorAttachments[0].clearValue = this.clearColor.toObject();
    }
}
