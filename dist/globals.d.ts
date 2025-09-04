/// <reference types="@webgpu/types" />
import { Shader } from './shaders.js';
import { Simulation } from './simulation.js';
import { Color } from './utils.js';
declare class Logger {
    constructor();
    private fmt;
    log(msg: string): void;
    error(msg: string): Error;
    warn(msg: string): void;
    log_error(msg: string): void;
}
export declare const logger: Logger;
export declare class GlobalInfo {
    private canvas;
    private device;
    private defaultColor;
    constructor();
    setDefaultColor(color: Color): void;
    getDefaultColor(): Color;
    setCanvas(canvas: Simulation): void;
    errorGetCanvas(): Simulation;
    getCanvas(): Simulation | null;
    setDevice(device: GPUDevice): void;
    errorGetDevice(): GPUDevice;
    getDevice(): GPUDevice | null;
}
export declare const globalInfo: GlobalInfo;
export declare class PipelineCache {
    private pipelines;
    constructor();
    getPipeline(device: GPUDevice, info: string, shader: Shader): GPURenderPipeline;
}
export declare const pipelineCache: PipelineCache;
export {};
