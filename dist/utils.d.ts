/// <reference types="dist" />
import { SimulationElement } from './graphics.js';
import { Vector3 } from './types.js';
import { Camera } from './simulation.js';
export declare const buildProjectionMatrix: (aspectRatio: number, zNear?: number, zFar?: number) => any;
export declare const getTransformationMatrix: (pos: Vector3, rotation: Vector3, projectionMatrix: mat4) => Float32Array;
export declare const getOrthoMatrix: (screenSize: [number, number]) => Float32Array;
export declare const buildDepthTexture: (device: GPUDevice, width: number, height: number) => GPUTexture;
export declare const applyElementToScene: (scene: SimulationElement[], camera: Camera | null, el: SimulationElement) => void;
declare class Logger {
    constructor();
    private fmt;
    log(msg: string): void;
    error(msg: string): Error;
    warn(msg: string): void;
    log_error(msg: string): void;
}
export declare const logger: Logger;
export {};
