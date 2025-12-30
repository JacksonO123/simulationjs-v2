import { WebGLMemoBuffer } from '../buffers/webgl.js';
import { FLOAT_SIZE, mat4ByteLength } from '../constants.js';
import { logger } from '../globals.js';
import { SimulationElement3d } from '../graphics.js';
import { orthogonalMatrix, worldProjectionMatrix } from '../simulation.js';
import { VertexBufferWriter, WebGLBufferDecleration } from '../types.js';
import {
    defaultVertexBufferWriter,
    defaultVertexColorBufferWriter,
    SimJSShader
} from './shader.js';

type WebGLUniformBufferWriter<T> = (
    programInfo: T,
    gl: WebGL2RenderingContext,
    element: SimulationElement3d,
    buffers: WebGLMemoBuffer[]
) => void;

/// attribute/uniform name to size
/// attribute declerations must be in order
type ProgramInfoLayout = {
    attributeLocations: { [key: string]: number }[];
    uniformLocations: { [key: string]: number }[];
};

type ToTuple<T> = [keyof T, T[keyof T]];
type ToTupleList<T> = T extends [infer First, ...infer Rest]
    ? [ToTuple<First>, ...ToTupleList<Rest>]
    : [];

type ProgramInfoLayoutToInfo<T extends ProgramInfoLayout> = {
    program: WebGLProgram;
    attributeLocations: ToTupleList<T['attributeLocations']>;
    uniformLocations: ToTupleList<T['uniformLocations']>;
};

export class SimJSWebGLShader<T extends ProgramInfoLayout> extends SimJSShader {
    protected buffers: WebGLMemoBuffer[];
    private shaderProgram: WebGLProgram | null = null;
    private shaderProgramInfoLayout: T | null = null;
    private shaderProgramInfo: ProgramInfoLayoutToInfo<T> | null = null;
    private gl: WebGL2RenderingContext | null = null;
    private uniformBufferWriter: WebGLUniformBufferWriter<ProgramInfoLayoutToInfo<T>>;
    private getShaderProgramInfoFn: () => T;
    private vertexSource: string;
    private fragmentSource: string;
    private bufferDeclerations: WebGLBufferDecleration[];

    constructor(
        vertexSource: string,
        fragmentSource: string,
        bufferDeclerations: WebGLBufferDecleration[],
        uniformBufferWriter: WebGLUniformBufferWriter<ProgramInfoLayoutToInfo<T>>,
        vertexBufferWriter: VertexBufferWriter,
        getShaderProgramInfoFn: () => T
    ) {
        super('webgl', vertexBufferWriter);

        this.buffers = [];
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;
        this.uniformBufferWriter = uniformBufferWriter;
        this.getShaderProgramInfoFn = getShaderProgramInfoFn;
        this.bufferDeclerations = bufferDeclerations;
    }

    init(gl: WebGL2RenderingContext) {
        this.gl = gl;

        this.shaderProgram = this.initShaderProgram(gl, this.vertexSource, this.fragmentSource);
        this.shaderProgramInfoLayout = this.getShaderProgramInfoFn();
        this.shaderProgramInfo = this.programInfoLayoutToProgramInfo(
            this.shaderProgram,
            gl,
            this.shaderProgramInfoLayout
        );

        for (const dec of this.bufferDeclerations) {
            const buf = new WebGLMemoBuffer(
                this.gl,
                dec.target,
                dec.usage,
                dec.defaultCapacity ?? 0
            );
            this.buffers.push(buf);
        }
    }

    programInfoLayoutToProgramInfo(
        program: WebGLProgram,
        gl: WebGL2RenderingContext,
        layout: T
    ): ProgramInfoLayoutToInfo<T> {
        const res: ProgramInfoLayoutToInfo<T> = {
            program: program,
            // @ts-ignore
            attributeLocations: [],
            // @ts-ignore
            uniformLocations: []
        };

        let bufferLength = 0;
        for (const obj of layout.attributeLocations) {
            const key = Object.keys(obj)[0];
            const size = obj[key];
            const loc = gl.getAttribLocation(program, key);
            const tuple = [key, loc] as const;
            // @ts-ignore
            res.attributeLocations.push(tuple);
            bufferLength += size;
        }
        this.bufferLength = bufferLength;

        for (const obj of layout.uniformLocations) {
            const key = Object.keys(obj)[0];
            const loc = gl.getUniformLocation(program, key);
            const tuple = [key, loc] as const;
            // @ts-ignore
            res.uniformLocations.push(tuple);
        }

        return res;
    }

    private initShaderProgram(
        gl: WebGL2RenderingContext,
        vertexShaderSource: string,
        fragmentShaderSource: string
    ) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

        const shaderProgram = gl.createProgram();
        if (!shaderProgram) throw logger.error('Shader program init error');
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw logger.error('Error initializing shader program');
        }

        return shaderProgram;
    }

    private loadShader(
        ctx: WebGL2RenderingContext,
        shaderType: WebGLRenderingContextBase[keyof WebGLRenderingContextBase],
        code: string
    ) {
        const shader = ctx.createShader(shaderType as GLenum);
        if (!shader) throw logger.error('Error creating shader');

        ctx.shaderSource(shader, code);
        ctx.compileShader(shader);

        if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
            const err = logger.error(`Error compiling shaders: ${ctx.getShaderInfoLog(shader)}`);
            ctx.deleteShader(shader);
            throw err;
        }

        return shader;
    }

    getShaderProgram() {
        if (!this.shaderProgram) throw logger.error('Shader program not initialized');
        return this.shaderProgram;
    }

    getShaderProgramInfo() {
        if (!this.shaderProgramInfo) throw logger.error('Shader program not initialized');
        return this.shaderProgramInfo;
    }

    writeUniformBuffers(obj: SimulationElement3d) {
        if (!this.gl || !this.shaderProgramInfo) throw logger.error('Shader not initialized');
        this.uniformBufferWriter(this.shaderProgramInfo, this.gl, obj, this.buffers);
    }

    writeShaderProgramAttributes(
        buffer: WebGLMemoBuffer,
        vertexCallOffset: number,
        vertexCallBuffer: Float32Array
    ) {
        if (!this.gl || !this.shaderProgramInfoLayout || !this.shaderProgramInfo) {
            throw logger.error('Shader not initialized');
        }

        const gl = this.gl;

        buffer.write(vertexCallBuffer, vertexCallOffset);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.getBuffer());

        const STRIDE = this.bufferLength * FLOAT_SIZE;
        let localOffset = 0;

        for (let i = 0; i < this.shaderProgramInfo.attributeLocations.length; i++) {
            const [key, loc] = this.shaderProgramInfo.attributeLocations[i];
            const size = this.shaderProgramInfoLayout.attributeLocations[i][key];

            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(
                loc,
                size,
                gl.FLOAT,
                false,
                STRIDE,
                vertexCallOffset + localOffset
            );

            localOffset += size * FLOAT_SIZE;
        }
    }
}

type WebGLDefaultShaderProgramInfo = {
    attributeLocations: [
        { position: number },
        { color: number },
        { uv: number },
        { drawingInstance: number }
        // instanceMatrix: number;
    ];
    uniformLocations: [{ worldProjectionMatrix: number }, { modelProjectionMatrix: number }];
};

function defaultWebGLUniformBufferWriter(
    programInfo: ProgramInfoLayoutToInfo<WebGLDefaultShaderProgramInfo>,
    gl: WebGL2RenderingContext,
    obj: SimulationElement3d,
    _buffers: WebGLMemoBuffer[]
) {
    const projBuf = obj.is3d ? worldProjectionMatrix : orthogonalMatrix;
    let buffer = obj.getUniformBuffer() as WebGLMemoBuffer | null;
    if (!buffer) {
        buffer = new WebGLMemoBuffer(
            gl,
            gl.ARRAY_BUFFER,
            gl.DYNAMIC_DRAW,
            WEBGL_DEFAULT_SHADER_UNIFORM_BUFFER_SIZE
        );
        obj.setUniformBuffer(buffer);
    } else {
        buffer.as('webgl');
    }

    gl.uniformMatrix4fv(programInfo.uniformLocations[0][1], false, projBuf);

    const modelMatrix = obj.getModelMatrix();
    gl.uniformMatrix4fv(programInfo.uniformLocations[1][1], false, modelMatrix);

    // gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // if (obj.isInstance) {
    //     buffers[0].write((obj as Instance<SimulationElement3d>).getInstanceBuffer());
    // }

    // gl.bindBuffer(gl.ARRAY_BUFFER, buffers[0].getBuffer());
    // const mat4BaseLoc = programInfo.attributeLocations.instanceMatrix;
    // const mat4Stride = 64;
    // for (let i = 0; i < 4; i++) {
    //     const loc = mat4BaseLoc + i;
    //     const offset = i * 4 * FLOAT_SIZE;

    //     gl.enableVertexAttribArray(loc);
    //     gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, mat4Stride, offset);
    //     gl.vertexAttribDivisor(loc, 1);
    // }
    // gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

const defaultWebGLVertexShader = `#version 300 es

// uniforms
uniform mat4 worldProjectionMatrix;
uniform mat4 modelProjectionMatrix;

// attributes
layout(location = 0) in vec3 position;
layout(location = 1) in vec4 color;
layout(location = 2) in vec2 uv;
layout(location = 3) in float drawingInstance;

// consumes locations 4, 5, 6, 7
//layout(location = 4) in mat4 instanceMatrix; 

out vec2 vFragUV;
out vec4 vFragColor;
out vec4 vFragPosition;

void main() {
    vec4 finalPosition;
    vec4 posInput = vec4(position, 1.0);

    if (drawingInstance == 1.0) {
        //finalPosition = worldProjectionMatrix * modelProjectionMatrix * instanceMatrix * posInput;
        finalPosition = worldProjectionMatrix * modelProjectionMatrix * posInput;
    } else {
        finalPosition = worldProjectionMatrix * modelProjectionMatrix * posInput;
    }

    gl_Position = finalPosition;

    vFragUV = uv;
    vFragColor = color;
    vFragPosition = finalPosition;
}
`;

const defaultWebGLFragmentShader = `#version 300 es
precision mediump float;

in vec2 vFragUV;
in vec4 vFragColor;
in vec4 vFragPosition;

layout(location = 0) out vec4 outColor;

void main() {
    outColor = vFragColor;
}
`;

const WEBGL_DEFAULT_SHADER_UNIFORM_BUFFER_SIZE = mat4ByteLength * 2;

export const defaultWebGLShader = new SimJSWebGLShader(
    defaultWebGLVertexShader,
    defaultWebGLFragmentShader,
    [
        // {
        //     target: WebGL2RenderingContext.ARRAY_BUFFER,
        //     usage: WebGL2RenderingContext.DYNAMIC_DRAW,
        //     defaultCapacity: 64
        // }
    ],
    defaultWebGLUniformBufferWriter,
    defaultVertexBufferWriter,
    () => ({
        attributeLocations: [
            { position: 3 },
            { color: 4 },
            { uv: 2 },
            { drawingInstance: 1 }
            // instanceMatrix: 16
        ] as const,
        uniformLocations: [{ worldProjectionMatrix: 64 }, { modelProjectionMatrix: 64 }] as const
    })
);

export const defaultWebGLVertexColorShader = new SimJSWebGLShader(
    defaultWebGLVertexShader,
    defaultWebGLFragmentShader,
    [
        // {
        //     target: WebGL2RenderingContext.ARRAY_BUFFER,
        //     usage: WebGL2RenderingContext.DYNAMIC_DRAW,
        //     defaultCapacity: 64
        // }
    ],
    defaultWebGLUniformBufferWriter,
    defaultVertexColorBufferWriter,
    () => ({
        attributeLocations: [
            { position: 3 },
            { color: 4 },
            { uv: 2 },
            { drawingInstance: 1 }
            // instanceMatrix: 16
        ] as const,
        uniformLocations: [{ worldProjectionMatrix: 64 }, { modelProjectionMatrix: 64 }] as const
    })
);
