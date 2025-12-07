import { WebGPUBackend } from './backend.js';
import { globalInfo } from './globals.js';
import { ArrayTypes } from './types.js';

export abstract class MemoBuffer<T> {
    protected buffer: T | null;
    protected bufferCapacity: number;

    constructor(initCapacity: number) {
        this.bufferCapacity = initCapacity;
        this.buffer = null;
    }

    allocBuffer() {}
    write(_buf: ArrayTypes, _offset = 0) {}
    destroy() {}

    getBuffer() {
        if (!this.buffer) this.allocBuffer();
        return this.buffer!;
    }

    private growCapacity(current: number, target: number) {
        let res = Math.max(1, current);
        while (res < target) {
            res += Math.ceil(res / 2);
        }
        return res;
    }

    ensureCapacity(capacity: number) {
        this.setCapacityPrecise(this.growCapacity(this.bufferCapacity, capacity));
    }

    setCapacityPrecise(capacity: number) {
        if (!this.buffer) {
            this.bufferCapacity = capacity;
            this.allocBuffer();
        }
        if (capacity <= this.bufferCapacity) return;

        this.bufferCapacity = capacity;
        this.allocBuffer();
    }
}

export class WebGPUMemoBuffer extends MemoBuffer<GPUBuffer> {
    protected device: GPUDevice;
    private usage: GPUBufferDescriptor['usage'];

    constructor(device: GPUDevice, usage: GPUBufferDescriptor['usage'], initCapacity: number) {
        super(initCapacity);
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
        // TODO - probably change
        const backend = globalInfo.errorGetCanvas().getBackend() as WebGPUBackend;
        const device = backend.getDevice()!;

        if (!this.buffer || buf.byteLength > this.bufferCapacity) {
            this.bufferCapacity = buf.byteLength;
            this.allocBuffer();
        }

        device.queue.writeBuffer(this.buffer!, offset, buf.buffer, buf.byteOffset, buf.byteLength);
    }

    destroy() {
        this.buffer?.destroy();
    }
}
