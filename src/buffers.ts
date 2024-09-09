import { globalInfo } from './internalUtils.js';

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
    const device = globalInfo.errorGetDevice();

    this.buffer = device.createBuffer({
      size: this.bufferSize,
      usage: this.usage
    });
  }

  getBuffer() {
    if (!this.buffer) this.allocBuffer();
    return this.buffer as GPUBuffer;
  }

  setSize(size: number) {
    if (size > this.bufferSize) {
      this.bufferSize = size;
      this.allocBuffer();
    }
  }

  destroy() {
    this.buffer?.destroy();
  }
}
