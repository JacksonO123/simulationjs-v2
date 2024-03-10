import { mat4, vec3 } from 'wgpu-matrix';
import { SimulationElement, vector3, vec3ToPixelRatio, vector2 } from './graphics.js';
export * from './graphics.js';
export const vertexSize = 40; // 4 * 10
export const colorOffset = 16; // 4 * 4
export const uvOffset = 32; // 4 * 8
const shader = `
struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  orthoProjectionMatrix : mat4x4<f32>,
  screenSize : vec2<f32>,
}
 
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragColor : vec4<f32>,
  @location(2) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
  @location(2) uv : vec2<f32>
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
  output.fragColor = color;
  return output;
}

@vertex
fn vertex_main_2d(
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
  @location(2) uv : vec2<f32>
) -> VertexOutput {
  var output : VertexOutput;
  output.Position = uniforms.orthoProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = position;
  output.fragColor = color;
  return output;
}

@fragment
fn fragment_main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  return fragColor;
  // return fragPosition;
}
`;
class Logger {
    constructor() { }
    fmt(msg) {
        return `SimJS: ${msg}`;
    }
    log(msg) {
        console.log(this.fmt(msg));
    }
    error(msg) {
        return new Error(this.fmt(msg));
    }
    warn(msg) {
        console.warn(this.fmt(msg));
    }
    log_error(msg) {
        console.error(this.fmt(msg));
    }
}
const logger = new Logger();
const simjsFrameRateCss = `@import url('https://fonts.googleapis.com/css2?family=Roboto+Mono&family=Roboto:wght@100&display=swap');

.simjs-frame-rate {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  z-index: 1000;
  font-family: Roboto Mono;
  font-size: 16px;
}`;
class FrameRateView {
    el;
    fpsBuffer = [];
    maxFpsBufferLength = 8;
    constructor(show) {
        this.el = document.createElement('div');
        this.el.classList.add('simjs-frame-rate');
        const style = document.createElement('style');
        style.innerHTML = simjsFrameRateCss;
        if (show) {
            document.head.appendChild(style);
            document.body.appendChild(this.el);
        }
    }
    updateFrameRate(num) {
        if (this.fpsBuffer.length < this.maxFpsBufferLength) {
            this.fpsBuffer.push(num);
        }
        else {
            this.fpsBuffer.shift();
            this.fpsBuffer.push(num);
        }
        const fps = Math.round(this.fpsBuffer.reduce((acc, curr) => acc + curr, 0) / this.fpsBuffer.length);
        this.el.innerHTML = `${fps} FPS`;
    }
}
export class Simulation {
    canvasRef = null;
    bgColor = new Color(255, 255, 255);
    scene = [];
    fittingElement = false;
    running = true;
    frameRateView;
    camera;
    constructor(idOrCanvasRef, camera = null, showFrameRate = false) {
        if (typeof idOrCanvasRef === 'string') {
            const ref = document.getElementById(idOrCanvasRef);
            if (ref !== null)
                this.canvasRef = ref;
            else
                throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
        }
        else {
            this.canvasRef = idOrCanvasRef;
        }
        if (!(this.canvasRef instanceof HTMLCanvasElement)) {
            throw logger.error('Invalid canvas');
        }
        else {
            const parent = this.canvasRef.parentElement;
            if (!camera) {
                this.camera = new Camera(vector3());
            }
            else {
                this.camera = camera;
            }
            if (parent === null) {
                throw logger.error('Canvas parent is null');
            }
            addEventListener('resize', () => {
                if (this.fittingElement) {
                    const width = parent.clientWidth;
                    const height = parent.clientHeight;
                    const aspectRatio = width / height;
                    this.camera?.setAspectRatio(aspectRatio);
                    this.setCanvasSize(width, height);
                }
            });
        }
        this.frameRateView = new FrameRateView(showFrameRate);
        this.frameRateView.updateFrameRate(1);
    }
    add(el) {
        if (el instanceof SimulationElement) {
            if (this.camera) {
                el.setCamera(this.camera);
            }
            this.scene.push(el);
        }
        else {
            throw logger.error('Can only add SimulationElements to the scene');
        }
    }
    setCanvasSize(width, height) {
        this.assertHasCanvas();
        this.canvasRef.width = width * devicePixelRatio;
        this.canvasRef.height = height * devicePixelRatio;
        this.canvasRef.style.width = width + 'px';
        this.canvasRef.style.height = height + 'px';
    }
    start() {
        (async () => {
            this.running = true;
            this.assertHasCanvas();
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter)
                throw logger.error('Adapter is null');
            const device = await adapter.requestDevice();
            const ctx = this.canvasRef.getContext('webgpu');
            if (!ctx)
                throw logger.error('Context is null');
            ctx.configure({
                device,
                format: 'bgra8unorm'
            });
            const screenSize = vector2(this.canvasRef.width, this.canvasRef.height);
            this.camera.setScreenSize(screenSize);
            this.render(device, ctx);
        })();
    }
    stop() {
        this.running = false;
    }
    setBackground(color) {
        this.bgColor = color;
    }
    render(device, ctx) {
        this.assertHasCanvas();
        const canvas = this.canvasRef;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        const shaderModule = device.createShaderModule({ code: shader });
        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied'
        });
        const pipeline3d = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vertex_main',
                buffers: [
                    {
                        arrayStride: vertexSize,
                        attributes: [
                            {
                                // position
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x4'
                            },
                            {
                                // color
                                shaderLocation: 1,
                                offset: colorOffset,
                                format: 'float32x4'
                            },
                            {
                                // uv
                                shaderLocation: 2,
                                offset: uvOffset,
                                format: 'float32x2'
                            }
                        ]
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragment_main',
                targets: [
                    {
                        format: presentationFormat
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
        const pipeline2d = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: shaderModule,
                entryPoint: 'vertex_main_2d',
                buffers: [
                    {
                        arrayStride: vertexSize,
                        attributes: [
                            {
                                // position
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x4'
                            },
                            {
                                // color
                                shaderLocation: 1,
                                offset: colorOffset,
                                format: 'float32x4'
                            },
                            {
                                // size
                                shaderLocation: 2,
                                offset: uvOffset,
                                format: 'float32x2'
                            }
                        ]
                    }
                ]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragment_main',
                targets: [
                    {
                        format: presentationFormat
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
        const uniformBufferSize = 4 * 16 + 4 * 16 + 4 * 2 + 8; // 4x4 matrix + 4x4 matrix + vec2<f32> + 8 bc 144 is cool
        const uniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const uniformBindGroup = device.createBindGroup({
            layout: pipeline3d.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer
                    }
                }
            ]
        });
        const colorAttachment = {
            // @ts-ignore
            view: undefined,
            clearValue: this.bgColor.toObject(),
            loadOp: 'clear',
            storeOp: 'store'
        };
        let aspect = canvas.width / canvas.height;
        let projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 0, 100);
        const modelViewProjectionMatrix = mat4.create();
        function getTransformationMatrix(sim) {
            const viewMatrix = mat4.identity();
            const camPos = vector3();
            const camRot = sim.camera.getRotation();
            vec3.clone(sim.camera.getPos(), camPos);
            vec3.scale(camPos, -1, camPos);
            mat4.rotateZ(viewMatrix, camRot[2], viewMatrix);
            mat4.rotateY(viewMatrix, camRot[1], viewMatrix);
            mat4.rotateX(viewMatrix, camRot[0], viewMatrix);
            mat4.translate(viewMatrix, camPos, viewMatrix);
            mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
            return modelViewProjectionMatrix;
        }
        function getOrthoMatrix(sim) {
            const screenSize = sim.camera.getScreenSize();
            return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100);
        }
        let prev = Date.now() - 10;
        let prevFps = 0;
        function frame(sim) {
            if (!sim.running)
                return;
            const now = Date.now();
            const diff = Math.max(now - prev, 1);
            prev = now;
            const fps = 1000 / diff;
            if (fps === prevFps) {
                sim.frameRateView.updateFrameRate(fps);
            }
            prevFps = fps;
            if (!canvas)
                return;
            canvas.width = canvas.clientWidth * devicePixelRatio;
            canvas.height = canvas.clientHeight * devicePixelRatio;
            const newAspect = canvas.width / canvas.height;
            if (newAspect !== aspect) {
                projectionMatrix = mat4.perspective((2 * Math.PI) / 5, newAspect, 1, 100.0);
            }
            const depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            const renderPassDescriptor = {
                colorAttachments: [colorAttachment],
                depthStencilAttachment: {
                    view: depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store'
                }
            };
            const transformationMatrix = getTransformationMatrix(sim);
            device.queue.writeBuffer(uniformBuffer, 0, transformationMatrix.buffer, transformationMatrix.byteOffset, transformationMatrix.byteLength);
            const orthoMatrix = getOrthoMatrix(sim);
            device.queue.writeBuffer(uniformBuffer, 4 * 16, // 4x4 matrix
            orthoMatrix.buffer, orthoMatrix.byteOffset, orthoMatrix.byteLength);
            const camScreenSize = sim.camera.getScreenSize();
            const screenSize = new Float32Array([camScreenSize[0], camScreenSize[1]]);
            device.queue.writeBuffer(uniformBuffer, 4 * 16 + 4 * 16, // 4x4 matrix + 4x4 matrix
            screenSize.buffer, screenSize.byteOffset, screenSize.byteLength);
            const tempVertexArr3d = [];
            const tempVertexArr2d = [];
            let vertexCount3d = 0;
            let vertexCount2d = 0;
            sim.scene.forEach((obj) => {
                if (obj.is3d) {
                    tempVertexArr3d.push(...obj.getBuffer(sim.camera, sim.camera.hasUpdated()));
                    vertexCount3d += obj.getTriangleCount();
                }
                else {
                    tempVertexArr2d.push(...obj.getBuffer(sim.camera, sim.camera.hasUpdated()));
                    vertexCount2d += obj.getTriangleCount();
                }
            });
            const vertexArr3d = new Float32Array(tempVertexArr3d);
            const vertexArr2d = new Float32Array(tempVertexArr2d);
            const verticesBuffer3d = device.createBuffer({
                size: vertexArr3d.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true
            });
            new Float32Array(verticesBuffer3d.getMappedRange()).set(vertexArr3d);
            verticesBuffer3d.unmap();
            const verticesBuffer2d = device.createBuffer({
                size: vertexArr2d.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true
            });
            new Float32Array(verticesBuffer2d.getMappedRange()).set(vertexArr2d);
            verticesBuffer2d.unmap();
            // @ts-ignore
            renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
            if (vertexCount3d > 0) {
                const commandEncoder = device.createCommandEncoder();
                const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
                passEncoder.setPipeline(pipeline3d);
                passEncoder.setBindGroup(0, uniformBindGroup);
                passEncoder.setVertexBuffer(0, verticesBuffer3d);
                passEncoder.draw(vertexCount3d);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
            }
            if (vertexCount2d > 0) {
                const commandEncoder = device.createCommandEncoder();
                const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
                passEncoder.setPipeline(pipeline2d);
                passEncoder.setBindGroup(0, uniformBindGroup);
                passEncoder.setVertexBuffer(0, verticesBuffer2d);
                passEncoder.draw(vertexCount2d);
                passEncoder.end();
                device.queue.submit([commandEncoder.finish()]);
            }
            requestAnimationFrame(() => frame(sim));
        }
        requestAnimationFrame(() => frame(this));
    }
    fitElement() {
        this.assertHasCanvas();
        this.fittingElement = true;
        const parent = this.canvasRef.parentElement;
        if (parent !== null) {
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            this.setCanvasSize(width, height);
        }
    }
    assertHasCanvas() {
        if (this.canvasRef === null) {
            throw logger.error(`cannot complete action, canvas is null`);
        }
    }
}
export class Camera {
    pos;
    rotation;
    aspectRatio = 1;
    updated;
    screenSize = vector2();
    constructor(pos, rotation = vector3()) {
        this.pos = pos;
        vec3ToPixelRatio(this.pos);
        this.updated = false;
        this.rotation = rotation;
    }
    setScreenSize(size) {
        this.screenSize = size;
    }
    getScreenSize() {
        return this.screenSize;
    }
    hasUpdated() {
        return this.updated;
    }
    updateConsumed() {
        this.updated = false;
    }
    move(amount, t = 0, f) {
        const initial = vector3();
        vec3.clone(this.pos, initial);
        return transitionValues((p) => {
            const x = amount[0] * p;
            const y = amount[1] * p;
            const z = amount[2] * p;
            const diff = vector3(x, y, z);
            vec3.add(this.pos, diff, this.pos);
        }, () => {
            vec3.add(initial, amount, this.pos);
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        const diff = vector3();
        vec3.sub(pos, this.pos, diff);
        return transitionValues((p) => {
            const x = diff[0] * p;
            const y = diff[1] * p;
            const z = diff[2] * p;
            const amount = vector3(x, y, z);
            vec3.add(this.pos, amount, this.pos);
        }, () => {
            vec3.clone(pos, this.pos);
        }, t, f);
    }
    rotateTo(value, t = 0, f) {
        const diff = vec3.clone(value);
        vec3.sub(diff, diff, this.rotation);
        return transitionValues((p) => {
            const x = diff[0] * p;
            const y = diff[1] * p;
            const z = diff[2] * p;
            vec3.add(this.rotation, this.rotation, vector3(x, y, z));
            this.updated = true;
        }, () => {
            this.rotation = value;
        }, t, f);
    }
    rotate(amount, t = 0, f) {
        const initial = vector3();
        vec3.clone(this.rotation, initial);
        return transitionValues((p) => {
            const x = amount[0] * p;
            const y = amount[1] * p;
            const z = amount[2] * p;
            vec3.add(this.rotation, vector3(x, y, z), this.rotation);
            this.updated = true;
        }, () => {
            vec3.add(initial, amount, this.rotation);
        }, t, f);
    }
    getRotation() {
        return this.rotation;
    }
    getPos() {
        return this.pos;
    }
    setAspectRatio(num) {
        this.aspectRatio = num;
    }
    getAspectRatio() {
        return this.aspectRatio;
    }
}
export class Color {
    r; // 0 - 255
    g; // 0 - 255
    b; // 0 - 255
    a; // 0.0 - 1.0
    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
    toBuffer() {
        return [this.r / 255, this.g / 255, this.b / 255, this.a];
    }
    toObject() {
        return {
            r: this.r / 255,
            g: this.g / 255,
            b: this.b / 255,
            a: this.a
        };
    }
}
/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export function transitionValues(callback1, callback2, transitionLength, func) {
    return new Promise((resolve) => {
        if (transitionLength == 0) {
            callback2();
            resolve();
        }
        else {
            let prevPercent = 0;
            let prevTime = Date.now();
            const step = (t, f) => {
                const newT = f(t);
                callback1(newT - prevPercent, t);
                prevPercent = newT;
                const now = Date.now();
                let diff = now - prevTime;
                diff = diff === 0 ? 1 : diff;
                const fpsScale = 1 / diff;
                const inc = 1 / (1000 * fpsScale * transitionLength);
                prevTime = now;
                if (t < 1) {
                    window.requestAnimationFrame(() => step(t + inc, f));
                }
                else {
                    callback2();
                    resolve();
                }
            };
            step(0, func ? func : linearStep);
        }
    });
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
export function smoothStep(t) {
    const v1 = t * t;
    const v2 = 1 - (1 - t) * (1 - t);
    return lerp(v1, v2, t);
}
export function linearStep(n) {
    return n;
}
