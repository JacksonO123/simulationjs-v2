import { globalInfo } from './globals.js';

export class MemoBuffer {
  private buffer: GPUBuffer | null;
  private bufferSize: number;
  private usage: GPUBufferDescriptor['usage'];

  constructor(usage: GPUBufferDescriptor['usage'], size: number) {
    this.usage = usage;
    this.bufferSize = size;
    this.buffer = null;
  }

  private allocBuffer() {
    const device = globalInfo.getDevice();
    if (!device) return;

    this.buffer = device.createBuffer({
      size: this.bufferSize,
      usage: this.usage
    });
  }

  getBuffer() {
    if (!this.buffer) this.allocBuffer();
    return this.buffer!;
  }

  setSize(size: number) {
    if (!this.buffer) this.allocBuffer();

    if (size > this.bufferSize) {
      this.bufferSize = size;
      this.allocBuffer();
    }
  }

  destroy() {
    this.buffer?.destroy();
  }
}
