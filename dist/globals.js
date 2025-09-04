import { createPipeline } from './internalUtils.js';
import { color } from './utils.js';
class Logger {
    constructor() { }
    fmt(msg) {
        return `SimJS: ${msg}`;
    }
    log(msg) {
        console.log(this.fmt(msg));
    }
    error(msg) {
        return new Error(this.fmt(msg));
    }
    warn(msg) {
        console.warn(this.fmt(msg));
    }
    log_error(msg) {
        console.error(this.fmt(msg));
    }
}
export const logger = new Logger();
export class GlobalInfo {
    canvas;
    device;
    defaultColor;
    constructor() {
        this.canvas = null;
        this.device = null;
        this.defaultColor = null;
    }
    setDefaultColor(color) {
        this.defaultColor = color;
    }
    getDefaultColor() {
        return this.defaultColor?.clone() ?? color();
    }
    setCanvas(canvas) {
        this.canvas = canvas;
    }
    errorGetCanvas() {
        if (!this.canvas)
            throw logger.error('Canvas is null');
        return this.canvas;
    }
    getCanvas() {
        return this.canvas;
    }
    setDevice(device) {
        this.device = device;
    }
    errorGetDevice() {
        if (!this.device)
            throw logger.error('GPUDevice is null');
        return this.device;
    }
    getDevice() {
        return this.device;
    }
}
export const globalInfo = new GlobalInfo();
export class PipelineCache {
    pipelines;
    constructor() {
        this.pipelines = new Map();
    }
    getPipeline(device, info, shader) {
        const res = this.pipelines.get(info);
        if (!res)
            return createPipeline(device, info, shader);
        return res;
    }
}
export const pipelineCache = new PipelineCache();
