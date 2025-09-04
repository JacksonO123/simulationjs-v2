import { globalInfo } from './globals.js';
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
        const device = globalInfo.getDevice();
        if (!device)
            return;
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
        if (!this.buffer)
            this.allocBuffer();
        if (size > this.bufferSize) {
            this.bufferSize = size;
            this.allocBuffer();
        }
    }
    write(buf, offset = 0) {
        const device = globalInfo.errorGetDevice();
        if (!this.buffer || buf.byteLength > this.bufferSize) {
            this.bufferSize = buf.byteLength;
            this.allocBuffer();
        }
        device.queue.writeBuffer(this.buffer, offset, buf.buffer, buf.byteOffset, buf.byteLength);
    }
    destroy() {
        this.buffer?.destroy();
    }
}
