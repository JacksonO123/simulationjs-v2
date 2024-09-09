/// <reference types="@webgpu/types" />
export declare class Shader {
    private bindGroupLayoutDescriptor;
    private bindGroupLayout;
    private code;
    constructor(code: string, descriptor: GPUBindGroupLayoutDescriptor);
    getCode(): string;
    getBindGroupLayout(): GPUBindGroupLayout;
    getBindGroupLayoutDescriptor(): GPUBindGroupLayoutDescriptor;
}
export declare const defaultShader: Shader;
