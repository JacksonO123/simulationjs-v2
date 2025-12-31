import { logger } from '../globals.js';
import { Instance, SimulationElement3d } from '../graphics.js';
import { SimJsBackend } from './backend.js';
import { SimJSShader } from '../shaders/shader.js';
import { GPUBuffers, Vector2 } from '../types.js';
import { WebGLMemoBuffer } from '../buffers/webgl.js';
import { Simulation } from '../simulation.js';
import { defaultWebGLShader, defaultWebGLVertexColorShader } from '../shaders/webgl.js';

export class WebGLBackend extends SimJsBackend {
    private gl: WebGL2RenderingContext | null = null;
    protected buffers: GPUBuffers<'webgl'> | null = null;

    constructor(sim: Simulation) {
        super(sim, 'webgl');
    }

    async init(canvas: HTMLCanvasElement) {
        this.gl = canvas.getContext('webgl2');

        if (this.gl === null) {
            throw logger.error('WebGL init error');
        }

        this.buffers = {
            gpuVertexCallBuffer: new WebGLMemoBuffer(
                this.gl,
                this.gl.ARRAY_BUFFER,
                this.gl.DYNAMIC_DRAW,
                0
            ),
            gpuIndexBuffer: new WebGLMemoBuffer(
                this.gl,
                this.gl.ELEMENT_ARRAY_BUFFER,
                this.gl.DYNAMIC_DRAW,
                0
            )
        };

        this.gl.viewport(0, 0, canvas.width, canvas.height);
        const clearColor = this.clearColor.toObject();
        this.gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.initShader(defaultWebGLShader);
        this.initShader(defaultWebGLVertexColorShader);
    }

    isInitialized() {
        return this.gl !== null;
    }

    getContextOrError() {
        if (!this.gl) throw logger.error('Backend not initialized');
        return this.gl;
    }

    renderStart(_canvas: HTMLCanvasElement) {
        if (!this.gl) throw logger.error('Invalid render start state');
        const gl = this.gl;

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const clearColor = this.clearColor.toObject();
        gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    updateTextures(screenSize: Vector2) {
        const gl = this.gl;
        if (!gl) throw logger.error('Invalid update texture state');
        gl.viewport(0, 0, screenSize[0], screenSize[1]);
        const clearColor = this.clearColor.toObject();
        gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    preRender() {
        const gl = this.gl;
        if (!gl) throw logger.error('Backend not initialized');

        const clearColor = this.clearColor.toObject();
        gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    finishRender() {}

    initShader(shader: SimJSShader) {
        if (!this.gl) throw logger.error('WebGL context is null');

        const webglShader = shader.as('webgl');
        webglShader.init(this.gl);
    }

    draw(
        obj: SimulationElement3d,

        vertexCallOffset: number,
        vertexCallBuffer: Float32Array,

        indexOffset: number,
        indices: Uint32Array
    ): void {
        if (!this.gl || !this.buffers) throw logger.error('Invalid draw state');

        const gl = this.gl;
        const shader = obj.getShaderOrError().as('webgl');

        const shaderProgram = shader.getShaderProgram();
        if (!shaderProgram) throw logger.error('Null shader program');

        const program = shader.getShaderProgram();
        gl.useProgram(program);

        this.buffers.gpuVertexCallBuffer.ensureCapacity(vertexCallBuffer.length);
        shader.writeShaderProgramAttributes(
            this.buffers.gpuVertexCallBuffer,
            vertexCallOffset,
            vertexCallBuffer
        );
        shader.writeUniformBuffers(obj);

        this.buffers.gpuIndexBuffer.write(indices, indexOffset);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.gpuIndexBuffer.getBuffer());

        const topology = obj.getGeometryTopology();
        const wireframe = obj.isWireframe();
        const mode = wireframe
            ? gl.LINE_STRIP
            : topology === 'list'
              ? gl.TRIANGLES
              : gl.TRIANGLE_STRIP;
        const type = gl.UNSIGNED_INT;

        const instances = obj.isInstance
            ? (obj as Instance<SimulationElement3d>).getInstanceCount()
            : 1;

        gl.drawElementsInstanced(mode, indices.length, type, indexOffset, instances);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    destroy() {
        if (!this.gl || !this.buffers) return;
        this.gl.deleteBuffer(this.buffers.gpuVertexCallBuffer);
        this.gl.deleteBuffer(this.buffers.gpuIndexBuffer);
    }

    onClearColorChange() {
        if (!this.gl) return;
        const clearColor = this.clearColor.toObject();
        this.gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearColor.a);
    }
}
