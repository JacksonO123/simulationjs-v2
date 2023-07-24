export * from 'gl-matrix';
import { SimulationElement } from './graphics';
export * from './graphics';
const starterShader = `
struct VertexOut {
  @builtin(position) position : vec4<f32>,
  @location(0) color : vec4<f32>
};

struct CanvasSize {
  size: vec2<f32>
}

@group(0) @binding(0)
var<storage, read> canvasSize: CanvasSize;

@vertex
fn vertex_main(@location(0) position: vec4<f32>,
               @location(1) color: vec4<f32>) -> VertexOut
{
  var output : VertexOut;
  output.position = position / vec4(canvasSize.size[0], canvasSize.size[1], 1, 1);
  output.color = color;
  return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
  return fragData.color;
}
`;
function logStr(msg) {
    return `SimJS: ${msg}`;
}
class Logger {
    log(msg) {
        console.log(logStr(msg));
    }
    error(msg) {
        return new Error(logStr(msg));
    }
    warn(msg) {
        console.warn(logStr(msg));
    }
}
const logger = new Logger();
const simjsFrameRateCss = `.simjs-frame-rate {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  z-index: 1000;
}`;
class FrameRateView {
    elRef;
    fpsBuffer = [];
    maxFpsBufferLength = 8;
    constructor(show) {
        this.elRef = document.createElement('div');
        this.elRef.classList.add('simjs-frame-rate');
        const style = document.createElement('style');
        style.innerHTML = simjsFrameRateCss;
        if (show) {
            document.head.appendChild(style);
            document.body.appendChild(this.elRef);
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
        this.elRef.innerHTML = `${fps} FPS`;
    }
}
export class Simulation {
    canvasRef = null;
    bgColor = new Color(255, 255, 255);
    scene = [];
    fittingElement = false;
    running = true;
    frameRateView;
    constructor(idOrCanvasRef, showFrameRate = false) {
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
            if (parent === null) {
                throw logger.error('Canvas parent is null');
            }
            addEventListener('resize', () => {
                if (this.fittingElement) {
                    const width = parent.clientWidth;
                    const height = parent.clientHeight;
                    this.setCanvasSize(width, height);
                }
            });
        }
        this.frameRateView = new FrameRateView(showFrameRate);
        // TODO: remove this
        this.frameRateView.updateFrameRate(1);
    }
    add(el) {
        if (el instanceof SimulationElement) {
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
    async start() {
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
        this.render(device, ctx);
    }
    stop() {
        this.running = false;
    }
    setBackground(color) {
        this.bgColor = color;
    }
    render(device, ctx) {
        this.assertHasCanvas();
        const shaderModule = device.createShaderModule({
            code: starterShader
        });
        const vertexBuffers = {
            attributes: [
                {
                    shaderLocation: 0,
                    offset: 0,
                    format: 'float32x3'
                },
                {
                    shaderLocation: 1,
                    offset: 12,
                    format: 'float32x4'
                }
            ],
            arrayStride: 28,
            stepMode: 'vertex'
        };
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'read-only-storage'
                    }
                }
            ]
        });
        const pipelineDescriptor = {
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
            vertex: {
                module: shaderModule,
                entryPoint: 'vertex_main',
                buffers: [vertexBuffers]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fragment_main',
                targets: [
                    {
                        format: 'bgra8unorm'
                    }
                ]
            },
            primitive: {
                topology: 'triangle-list'
            }
        };
        const renderPipeline = device.createRenderPipeline(pipelineDescriptor);
        const width = this.canvasRef.width;
        const height = this.canvasRef.height;
        const sizeArray = new Float32Array([width, height]);
        const gpuSizeArray = device.createBuffer({
            mappedAtCreation: true,
            size: sizeArray.byteLength,
            usage: GPUBufferUsage.STORAGE
        });
        const arraySizeBuffer = gpuSizeArray.getMappedRange();
        new Float32Array(arraySizeBuffer).set(sizeArray);
        gpuSizeArray.unmap();
        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: gpuSizeArray
                    }
                }
            ]
        });
        let prev = Date.now() - 10;
        let prevFps = 0;
        (function renderLoop(c) {
            const now = Date.now();
            const diff = Math.max(now - prev, 1);
            prev = now;
            const fps = 1000 / diff;
            if (fps === prevFps) {
                c.frameRateView.updateFrameRate(fps);
            }
            prevFps = fps;
            let totalTriangles = 0;
            const verticesArr = [];
            c.scene.forEach((el) => {
                totalTriangles += el.getTriangleCount();
                verticesArr.push(...el.getBuffer());
            });
            const vertices = new Float32Array(verticesArr);
            const vertexBuffer = device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
            vertexBuffer.unmap();
            const bgColorBuffer = c.bgColor.toBuffer();
            const clearColor = {
                r: bgColorBuffer[0],
                g: bgColorBuffer[1],
                b: bgColorBuffer[2],
                a: bgColorBuffer[3]
            };
            const colorAttachment = {
                clearValue: clearColor,
                storeOp: 'store',
                loadOp: 'clear',
                view: ctx.getCurrentTexture().createView()
            };
            const renderPassDescriptor = {
                colorAttachments: [colorAttachment]
            };
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(renderPipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.draw(totalTriangles * 3);
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
            if (c.running) {
                requestAnimationFrame(() => renderLoop(c));
            }
        })(this);
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
