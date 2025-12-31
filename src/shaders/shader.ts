import { MemoBuffer } from '../buffers/buffer.js';
import { logger } from '../globals.js';
import { SimulationElement3d } from '../graphics.js';
import { BackendType, SpecificShaderType, Vector3, VertexBufferWriter } from '../types.js';

export abstract class SimJSShader {
    protected abstract buffers: MemoBuffer[];
    protected vertexBufferWriter: VertexBufferWriter;
    protected compatableBackend: BackendType;
    protected bufferLength: number;
    protected initialized = false;

    constructor(conpatableBackend: BackendType, vertexBufferWriter: VertexBufferWriter) {
        this.bufferLength = 0;
        this.vertexBufferWriter = vertexBufferWriter;
        this.compatableBackend = conpatableBackend;
    }

    abstract writeUniformBuffers(obj: SimulationElement3d): void;

    isInitialized() {
        return this.initialized;
    }

    setVertexInfo(
        element: SimulationElement3d,
        buffer: Float32Array,
        vertex: Vector3,
        vertexIndex: number,
        offset: number
    ) {
        this.vertexBufferWriter(element, buffer, vertex, vertexIndex, offset);
    }

    getCompatableBackend() {
        return this.compatableBackend;
    }

    compatableWith(backendType: BackendType) {
        return this.compatableBackend === backendType;
    }

    // returns number of floats (4 bytes)
    getBufferLength() {
        return this.bufferLength;
    }

    as<T extends BackendType>(type: T): SpecificShaderType<T> {
        if (this.compatableBackend !== type) throw logger.error('Incompatible shader cast');
        return this as unknown as SpecificShaderType<T>;
    }
}

export const defaultVertexBufferWriter: VertexBufferWriter = (
    el,
    buffer,
    vertex,
    vertexIndex,
    offset
) => {
    const material = el.getMaterial();
    const colors = material.getVertexColors();
    const vertexColor = colors[vertexIndex] ?? el.getColor();
    // const vertexColor = color(0, 255, 255);
    buffer[offset] = vertex[0];
    buffer[offset + 1] = vertex[1];
    buffer[offset + 2] = vertex[2];
    buffer[offset + 3] = vertexColor.r / 255;
    buffer[offset + 4] = vertexColor.g / 255;
    buffer[offset + 5] = vertexColor.b / 255;
    buffer[offset + 6] = vertexColor.a;
    // TODO possibly change uv for textures
    buffer[offset + 7] = 0;
    buffer[offset + 8] = 0;
    buffer[offset + 9] = el.isInstanced ? 1 : 0;
};

export const defaultVertexColorBufferWriter: VertexBufferWriter = (
    el,
    buffer,
    vertex,
    vertexIndex,
    offset
) => {
    const material = el.getMaterial();
    const colors = material.getVertexColors();
    const vertexColor = colors[vertexIndex] ?? el.getColor();
    // const vertexColor = color(0, 255, 255);
    buffer[offset] = vertex[0];
    buffer[offset + 1] = vertex[1];
    buffer[offset + 2] = vertex[2];
    buffer[offset + 3] = vertexColor.r / 255;
    buffer[offset + 4] = vertexColor.g / 255;
    buffer[offset + 5] = vertexColor.b / 255;
    buffer[offset + 6] = vertexColor.a;
    // TODO possibly change uv for textures
    buffer[offset + 7] = 0;
    buffer[offset + 8] = 0;
    buffer[offset + 9] = el.isInstanced ? 1 : 0;
};
