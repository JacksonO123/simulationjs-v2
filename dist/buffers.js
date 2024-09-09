import { globalInfo } from './internalUtils.js';
export class MemoBuffer {
    buffer;
    bufferSize;
    usage;
    constructor(usage, size) {
        this.usage = usage;
        this.bufferSize = size;
        this.buffer = null;
    }
    allocBuffer() {
        const device = globalInfo.errorGetDevice();
        this.buffer = device.createBuffer({
            size: this.bufferSize,
            usage: this.usage
        });
    }
    getBuffer() {
        if (!this.buffer)
            this.allocBuffer();
        return this.buffer;
    }
    setSize(size) {
        if (size > this.bufferSize) {
            this.bufferSize = size;
            this.allocBuffer();
        }
    }
    destroy() {
        this.buffer?.destroy();
    }
}
