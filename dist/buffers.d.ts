/// <reference types="@webgpu/types" />
export declare class MemoBuffer {
    private buffer;
    private bufferSize;
    private usage;
    constructor(usage: GPUBufferDescriptor['usage'], size: number);
    private allocBuffer;
    getBuffer(): GPUBuffer;
    setSize(size: number): void;
    destroy(): void;
}
