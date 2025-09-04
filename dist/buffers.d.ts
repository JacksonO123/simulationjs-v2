/// <reference types="@webgpu/types" />
import { ArrayTypes } from './types.js';
export declare class MemoBuffer {
    private buffer;
    private bufferSize;
    private usage;
    constructor(usage: GPUBufferDescriptor['usage'], size: number);
    private allocBuffer;
    getBuffer(): GPUBuffer;
    setSize(size: number): void;
    write(buf: ArrayTypes, offset?: number): void;
    destroy(): void;
}
