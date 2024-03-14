import { vec3 } from 'wgpu-matrix';
import { SimulationElement, vector2, vector3 } from './graphics.js';
import { BUF_LEN } from './constants.js';
import { applyElementToScene, buildDepthTexture, buildProjectionMatrix, getOrthoMatrix, getTransformationMatrix, logger } from './utils.js';
const vertexSize = 44; // 4 * 10 + 1
const colorOffset = 16; // 4 * 4
const uvOffset = 32; // 4 * 8
const is3dOffset = 40; // 4 * 10
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
  @location(2) uv : vec2<f32>,
  @location(3) is3d : f32
) -> VertexOutput {
  var output : VertexOutput;

  if is3d == 1 {
    output.Position = uniforms.modelViewProjectionMatrix * position;
  } else {
    output.Position = uniforms.orthoProjectionMatrix * position;
  }
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
        else if (idOrCanvasRef instanceof HTMLCanvasElement) {
            this.canvasRef = idOrCanvasRef;
        }
        else {
            throw logger.error(`Canvas ref/id provided is invalid`);
        }
        const parent = this.canvasRef.parentElement;
        if (!camera)
            this.camera = new Camera(vector3());
        else
            this.camera = camera;
        if (parent === null)
            throw logger.error('Canvas parent is null');
        addEventListener('resize', () => {
            if (this.fittingElement) {
                const width = parent.clientWidth;
                const height = parent.clientHeight;
                this.setCanvasSize(width, height);
            }
        });
        this.frameRateView = new FrameRateView(showFrameRate);
        this.frameRateView.updateFrameRate(1);
    }
    add(el) {
        applyElementToScene(this.scene, this.camera, el);
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
            this.assertHasCanvas();
            this.running = true;
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter)
                throw logger.error('Adapter is null');
            const ctx = this.canvasRef.getContext('webgpu');
            if (!ctx)
                throw logger.error('Context is null');
            const device = await adapter.requestDevice();
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
        const pipeline = device.createRenderPipeline({
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
                                // size
                                shaderLocation: 2,
                                offset: uvOffset,
                                format: 'float32x2'
                            },
                            {
                                // is3d
                                shaderLocation: 3,
                                offset: is3dOffset,
                                format: 'float32'
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
            layout: pipeline.getBindGroupLayout(0),
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
        let projectionMatrix = buildProjectionMatrix(aspect);
        let modelViewProjectionMatrix;
        let orthoMatrix;
        const updateModelViewProjectionMatrix = () => {
            modelViewProjectionMatrix = getTransformationMatrix(this.camera.getPos(), this.camera.getRotation(), projectionMatrix);
        };
        updateModelViewProjectionMatrix();
        const updateOrthoMatrix = () => {
            orthoMatrix = getOrthoMatrix(this.camera.getScreenSize());
        };
        updateOrthoMatrix();
        let depthTexture = buildDepthTexture(device, canvas.width, canvas.height);
        const renderPassDescriptor = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        };
        // sub 10 to start with a reasonable gap between starting time and next frame time
        let prev = Date.now() - 10;
        let prevFps = 0;
        const frame = () => {
            if (!this.running || !canvas)
                return;
            requestAnimationFrame(frame);
            const now = Date.now();
            const diff = Math.max(now - prev, 1);
            prev = now;
            const fps = 1000 / diff;
            if (fps === prevFps) {
                this.frameRateView.updateFrameRate(fps);
            }
            prevFps = fps;
            canvas.width = canvas.clientWidth * devicePixelRatio;
            canvas.height = canvas.clientHeight * devicePixelRatio;
            const screenSize = this.camera.getScreenSize();
            if (screenSize[0] !== canvas.width || screenSize[1] !== canvas.height) {
                this.camera.setScreenSize(vector2(canvas.width, canvas.height));
                screenSize[0] = canvas.width;
                screenSize[1] = canvas.height;
                aspect = this.camera.getAspectRatio();
                projectionMatrix = buildProjectionMatrix(aspect);
                updateModelViewProjectionMatrix();
                depthTexture = buildDepthTexture(device, screenSize[0], screenSize[1]);
                renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();
            }
            // @ts-ignore
            renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
            if (this.camera.hasUpdated()) {
                updateOrthoMatrix();
                updateModelViewProjectionMatrix();
            }
            device.queue.writeBuffer(uniformBuffer, 0, modelViewProjectionMatrix.buffer, modelViewProjectionMatrix.byteOffset, modelViewProjectionMatrix.byteLength);
            device.queue.writeBuffer(uniformBuffer, 4 * 16, // 4x4 matrix
            orthoMatrix.buffer, orthoMatrix.byteOffset, orthoMatrix.byteLength);
            device.queue.writeBuffer(uniformBuffer, 4 * 16 + 4 * 16, // 4x4 matrix + 4x4 matrix
            screenSize.buffer, screenSize.byteOffset, screenSize.byteLength);
            const vertexArray = [];
            this.scene.forEach((obj) => {
                const buffer = obj.getBuffer(this.camera, this.camera.hasUpdated());
                buffer.forEach((vertex) => vertexArray.push(vertex));
            });
            this.camera.updateConsumed();
            const vertexF32Array = new Float32Array(vertexArray);
            const vertexBuffer = device.createBuffer({
                size: vertexF32Array.byteLength,
                usage: GPUBufferUsage.VERTEX,
                mappedAtCreation: true
            });
            new Float32Array(vertexBuffer.getMappedRange()).set(vertexF32Array);
            vertexBuffer.unmap();
            const vertexCount = vertexF32Array.length / BUF_LEN;
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(pipeline);
            passEncoder.setBindGroup(0, uniformBindGroup);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.draw(vertexCount);
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        };
        requestAnimationFrame(frame);
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
export class SceneCollection extends SimulationElement {
    name;
    scene;
    constructor(name) {
        super(vector3());
        this.name = name;
        this.scene = [];
    }
    getName() {
        return this.name;
    }
    add(el) {
        applyElementToScene(this.scene, this.camera, el);
    }
    empty() {
        this.scene = [];
    }
    getBuffer(camera, force) {
        const res = [];
        this.scene.forEach((item) => res.push(...item.getBuffer(camera, force)));
        return res;
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
        this.updated = false;
        this.rotation = rotation;
    }
    setScreenSize(size) {
        this.screenSize = size;
        this.aspectRatio = size[0] / size[1];
        this.updated = true;
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
