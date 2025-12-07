import { createPipeline } from './internalUtils.js';
import { Shader } from './shaders/webgpu.js';
import { Simulation } from './simulation.js';
import { Color, color } from './utils.js';

class Logger {
    constructor() {}

    private fmt(msg: string) {
        return `SimJS: ${msg}`;
    }

    log(msg: string) {
        console.log(this.fmt(msg));
    }
    error(msg: string) {
        return new Error(this.fmt(msg));
    }
    warn(msg: string) {
        console.warn(this.fmt(msg));
    }
    log_error(msg: string) {
        console.error(this.fmt(msg));
    }
}

export const logger = new Logger();

export class GlobalInfo {
    private canvas: Simulation | null;
    private defaultColor: Color | null;
    private toInitShaders: Shader[];

    constructor() {
        this.canvas = null;
        this.defaultColor = null;
        this.toInitShaders = [];
    }

    setDefaultColor(color: Color) {
        this.defaultColor = color;
    }

    getDefaultColor() {
        return this.defaultColor?.clone() ?? color();
    }

    setCanvas(canvas: Simulation) {
        this.canvas = canvas;
    }

    errorGetCanvas() {
        if (!this.canvas) throw logger.error('Canvas is null');
        return this.canvas;
    }

    getCanvas() {
        return this.canvas;
    }

    addToInitShader(shader: Shader) {
        this.toInitShaders.push(shader);
    }

    getToInitShaders() {
        return this.toInitShaders;
    }
}

export const globalInfo = new GlobalInfo();

export class PipelineCache {
    private pipelines: Map<string, GPURenderPipeline>;

    constructor() {
        this.pipelines = new Map();
    }

    getPipeline(device: GPUDevice, info: string, shader: Shader) {
        const res = this.pipelines.get(info);
        if (!res) return createPipeline(device, info, shader);
        return res;
    }
}

export const pipelineCache = new PipelineCache();
