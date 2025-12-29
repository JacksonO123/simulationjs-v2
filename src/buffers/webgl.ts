import { logger } from '../globals.js';
import { ArrayTypes } from '../types.js';
import { MemoBuffer } from './buffer.js';

export class WebGLMemoBuffer extends MemoBuffer {
    private gl: WebGL2RenderingContext;
    protected buffer: WebGLBuffer | null = null;
    private target: number;
    private usage: number;

    constructor(gl: WebGL2RenderingContext, target: GLenum, usage: GLenum, initCapacity: number) {
        super('webgl', initCapacity);

        this.gl = gl;
        this.target = target;
        this.usage = usage;
    }

    allocBuffer() {
        const gl = this.gl;

        if (this.buffer) gl.deleteBuffer(this.buffer);

        this.buffer = gl.createBuffer();
        if (!this.buffer) throw logger.error('WebGLMemoBuffer init error');

        gl.bindBuffer(this.target, this.buffer);
        gl.bufferData(this.target, this.bufferCapacity, this.usage);
        gl.bindBuffer(this.target, null);
    }

    destroy() {
        if (this.buffer) {
            this.gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
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

        this.gl.bindBuffer(this.target, this.buffer);
        this.gl.bufferSubData(this.target, offset, buf);
        this.gl.bindBuffer(this.target, null);
    }
}
