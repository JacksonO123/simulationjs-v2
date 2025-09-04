/// <reference types="@webgpu/types" />
import { SimulationElement3d } from './graphics.js';
import { Shader } from './shaders.js';
export declare function createBindGroup(shader: Shader, bindGroupIndex: number, buffers: GPUBuffer[]): GPUBindGroup;
export declare function writeUniformWorldMatrix(el: SimulationElement3d): void;
