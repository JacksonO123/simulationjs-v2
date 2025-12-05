import { globalInfo, logger } from './globals.js';
import { buildDepthTexture, buildMultisampleTexture } from './internalUtils.js';
import { Simulation, camera } from './simulation.js';
import { Vector2 } from './types.js';
import { Color, vector2 } from './utils.js';

export abstract class SimJsBackend {
    // @ts-ignore
    protected simulation: Simulation;

    constructor(simulation: Simulation) {
        this.simulation = simulation;
    }

    // @ts-ignore
    async init(bgColor: Color) {}
    // @ts-ignore
    updateTextures(screenSize: Vector2) {}
    render() {}
}

export class WebGPUBackend extends SimJsBackend {
    private renderPassDescriptor: GPURenderPassDescriptor | null = null;
    // @ts-ignore
    private multisampleTexture: GPUTexture;
    // @ts-ignore
    private device: GPUDevice;
    // @ts-ignore
    private ctx: GPUCanvasContext;
    // @ts-ignore
    private depthTexture;

    async init(bgColor: Color) {
        const canvas = this.simulation.canvasRef;
        if (canvas === null) throw logger.error('Canvas is null');

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw logger.error('Adapter is null');

        const ctx = canvas.getContext('webgpu');
        if (!ctx) throw logger.error('Context is null');
        this.ctx = ctx;

        this.device = await adapter.requestDevice();
        globalInfo.setDevice(this.device);

        const screenSize = vector2(canvas.width, canvas.height);
        camera.setScreenSize(screenSize);

        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        ctx.configure({
            device: this.device,
            format: presentationFormat,
            alphaMode: 'opaque'
        });

        this.setRenderPassDescriptor(bgColor);
    }

    updateTextures(screenSize: Vector2) {
        this.multisampleTexture = buildMultisampleTexture(
            this.device,
            this.ctx,
            screenSize[0],
            screenSize[1]
        );
        this.depthTexture = buildDepthTexture(this.device, screenSize[0], screenSize[1]);
        this.renderPassDescriptor!.depthStencilAttachment!.view = this.depthTexture.createView();
    }

    private setRenderPassDescriptor(bgColor: Color) {
        const canvas = this.simulation.canvasRef;
        if (!canvas) return;

        const colorAttachment: GPURenderPassColorAttachment = {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            view: undefined, // Assigned later

            clearValue: bgColor.toObject(),
            loadOp: 'clear',
            storeOp: 'store'
        };

        this.multisampleTexture = buildMultisampleTexture(this.device, this.ctx, canvas.width, canvas.height);
        let depthTexture = buildDepthTexture(this.device, canvas.width, canvas.height);

        this.renderPassDescriptor = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        };
    }

    render() {}
}

export class WebGLBackend extends SimJsBackend {}
