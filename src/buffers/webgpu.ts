import { ArrayTypes } from '../types.js';
import { MemoBuffer } from './buffer.js';

export class WebGPUMemoBuffer extends MemoBuffer {
    protected device: GPUDevice;
    protected buffer: GPUBuffer | null = null;
    private usage: GPUBufferDescriptor['usage'];

    constructor(device: GPUDevice, usage: GPUBufferDescriptor['usage'], initCapacity: number) {
        super('webgpu', initCapacity);
        if (device === null) throw new Error('Device is null');
        this.device = device;
        this.usage = usage;
    }

    allocBuffer() {
        if (this.buffer) this.buffer.destroy();
        this.buffer = this.device.createBuffer({
            size: this.bufferCapacity,
            usage: this.usage
        });
    }

    getBuffer() {
        if (!this.buffer) this.allocBuffer();
        return this.buffer!;
    }

    write(buf: ArrayTypes, offset = 0) {
        const neededSize = offset + buf.byteLength;
        if (!this.buffer || neededSize > this.bufferCapacity) {
            this.bufferCapacity = neededSize;
            this.allocBuffer();
        }

        this.device.queue.writeBuffer(
            this.buffer!,
            offset,
            buf.buffer,
            buf.byteOffset,
            buf.byteLength
        );
    }

    destroy() {
        if (this.buffer) {
            this.buffer.destroy();
            this.buffer = null;
        }
    }
}
