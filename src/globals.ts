import { createPipeline } from './internalUtils.js';
import { Shader } from './shaders.js';
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
    private device: GPUDevice | null;
    private defaultColor: Color | null;

    constructor() {
        this.canvas = null;
        this.device = null;
        this.defaultColor = null;
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

    setDevice(device: GPUDevice) {
        this.device = device;
    }

    errorGetDevice() {
        if (!this.device) throw logger.error('GPUDevice is null');
        return this.device;
    }

    getDevice() {
        return this.device;
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
