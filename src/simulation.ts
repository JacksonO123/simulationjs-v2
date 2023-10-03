export * from 'gl-matrix';
import { vec3 } from 'gl-matrix';
import { SimulationElement, vec3From, vec3ToPixelRatio } from './graphics';
export * from './graphics';

export type LerpFunc = (n: number) => number;

const shader = `
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

function logStr(msg: string) {
  return `SimJS: ${msg}`;
}

class Logger {
  log(msg: string) {
    console.log(logStr(msg));
  }
  error(msg: string) {
    return new Error(logStr(msg));
  }
  warn(msg: string) {
    console.warn(logStr(msg));
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
  private elRef: HTMLDivElement;
  private fpsBuffer: number[] = [];
  private maxFpsBufferLength = 8;
  constructor(show: boolean) {
    this.elRef = document.createElement('div');
    this.elRef.classList.add('simjs-frame-rate');

    const style = document.createElement('style');
    style.innerHTML = simjsFrameRateCss;

    if (show) {
      document.head.appendChild(style);
      document.body.appendChild(this.elRef);
    }
  }
  updateFrameRate(num: number) {
    if (this.fpsBuffer.length < this.maxFpsBufferLength) {
      this.fpsBuffer.push(num);
    } else {
      this.fpsBuffer.shift();
      this.fpsBuffer.push(num);
    }

    const fps = Math.round(this.fpsBuffer.reduce((acc, curr) => acc + curr, 0) / this.fpsBuffer.length);
    this.elRef.innerHTML = `${fps} FPS`;
  }
  // TODO: maybe make a toggle for this
}

export class Simulation {
  canvasRef: HTMLCanvasElement | null = null;
  private bgColor: Color = new Color(255, 255, 255);
  private scene: SimulationElement[] = [];
  private fittingElement = false;
  private running = true;
  private frameRateView: FrameRateView;
  private camera: Camera | null;
  constructor(
    idOrCanvasRef: string | HTMLCanvasElement,
    camera: Camera | null = null,
    showFrameRate = false
  ) {
    if (typeof idOrCanvasRef === 'string') {
      const ref = document.getElementById(idOrCanvasRef) as HTMLCanvasElement | null;
      if (ref !== null) this.canvasRef = ref;
      else throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
    } else {
      this.canvasRef = idOrCanvasRef;
    }

    if (!(this.canvasRef instanceof HTMLCanvasElement)) {
      throw logger.error('Invalid canvas');
    } else {
      const parent = this.canvasRef.parentElement;

      this.camera = camera;
      if (this.camera) {
        this.camera.setDisplaySurface(
          vec3From(this.canvasRef.clientWidth / 2, this.canvasRef.clientHeight / 2, 2000)
        );
      }

      if (parent === null) {
        throw logger.error('Canvas parent is null');
      }

      addEventListener('resize', () => {
        if (this.fittingElement) {
          const width = parent.clientWidth;
          const height = parent.clientHeight;

          if (this.camera) {
            this.camera.setDisplaySurface(vec3From(width / 2, height / 2, 2000));
          }

          const aspectRatio = width / height;
          this.camera?.setAspectRatio(aspectRatio);

          this.setCanvasSize(width, height);
        }
      });
    }

    this.frameRateView = new FrameRateView(showFrameRate);
    this.frameRateView.updateFrameRate(1);
  }
  add(el: SimulationElement) {
    if (el instanceof SimulationElement) {
      if (this.camera) {
        el.setCamera(this.camera);
      }
      this.scene.push(el);
    } else {
      throw logger.error('Can only add SimulationElements to the scene');
    }
  }
  setCanvasSize(width: number, height: number) {
    this.assertHasCanvas();

    this.canvasRef.width = width * devicePixelRatio;
    this.canvasRef.height = height * devicePixelRatio;
    this.canvasRef.style.width = width + 'px';
    this.canvasRef.style.height = height + 'px';
  }
  async start() {
    this.assertHasCanvas();

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) throw logger.error('Adapter is null');

    const device = await adapter.requestDevice();

    const ctx = this.canvasRef.getContext('webgpu');

    if (!ctx) throw logger.error('Context is null');

    ctx.configure({
      device,
      format: 'bgra8unorm'
    });

    this.render(device, ctx);
  }
  stop() {
    this.running = false;
  }
  setBackground(color: Color) {
    this.bgColor = color;
  }
  render(device: GPUDevice, ctx: GPUCanvasContext) {
    this.assertHasCanvas();

    const shaderModule = device.createShaderModule({
      code: shader
    });

    const vertexBuffers: GPUVertexBufferLayout = {
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
        } as GPUBindGroupLayoutEntry
      ]
    });

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
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
            format: 'bgra8unorm',
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            }
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
    (function renderLoop(c: Simulation) {
      const now = Date.now();
      const diff = Math.max(now - prev, 1);
      prev = now;

      const fps = 1000 / diff;

      if (fps === prevFps) {
        c.frameRateView.updateFrameRate(fps);
      }

      prevFps = fps;

      let totalTriangles = 0;
      const verticesArr: number[] = [];
      c.scene.forEach((el) => {
        let force = false;
        if (c.camera?.hasUpdated()) {
          force = true;
          c.camera.updateConsumed();
        }
        verticesArr.push(...el.getBuffer(force));
        totalTriangles += el.getTriangleCount();
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
      const clearColor: GPUColor = {
        r: bgColorBuffer[0],
        g: bgColorBuffer[1],
        b: bgColorBuffer[2],
        a: bgColorBuffer[3]
      };
      const colorAttachment: GPURenderPassColorAttachment = {
        clearValue: clearColor,
        storeOp: 'store',
        loadOp: 'clear',
        view: ctx.getCurrentTexture().createView()
      };

      const renderPassDescriptor: GPURenderPassDescriptor = {
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
  private assertHasCanvas(): asserts this is this & {
    canvasRef: HTMLCanvasElement;
  } {
    if (this.canvasRef === null) {
      throw logger.error(`cannot complete action, canvas is null`);
    }
  }
}

export class Camera {
  private pos: vec3;
  private rotation: vec3;
  private fov: number;
  private aspectRatio = 1;
  private near: number;
  private far: number;
  private updated: boolean;
  private displaySurface: vec3;
  constructor(pos: vec3, rotation = vec3From(), fov: number, near = 0.1, far = 100) {
    this.pos = pos;
    vec3ToPixelRatio(this.pos);
    this.fov = fov;
    this.near = near;
    this.far = far;
    this.rotation = rotation;
    this.updated = false;
    this.displaySurface = vec3From();
  }
  setDisplaySurface(surface: vec3) {
    this.displaySurface = surface;
  }
  getDisplaySurface() {
    return this.displaySurface;
  }
  hasUpdated() {
    return this.updated;
  }
  updateConsumed() {
    this.updated = false;
  }
  rotateTo(value: vec3, t = 0, f?: LerpFunc) {
    const diff = vec3.clone(value);
    vec3.sub(diff, diff, this.rotation);

    return transitionValues(
      (p) => {
        const x = diff[0] * p;
        const y = diff[1] * p;
        const z = diff[2] * p;
        vec3.add(this.rotation, this.rotation, vec3From(x, y, z));
        this.updated = true;
      },
      () => {
        this.rotation = value;
      },
      t,
      f
    );
  }
  getRotation() {
    return this.rotation;
  }
  getNear() {
    return this.near;
  }
  getFar() {
    return this.far;
  }
  getFov() {
    return this.fov;
  }
  getPos() {
    return this.pos;
  }
  setAspectRatio(num: number) {
    this.aspectRatio = num;
  }
  getAspectRatio() {
    return this.aspectRatio;
  }
}

export class Color {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
  a: number; // 0.0 - 1.0
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
    return [this.r / 255, this.g / 255, this.b / 255, this.a] as const;
  }
}

/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export function transitionValues(
  callback1: (deltaT: number, t: number) => void,
  callback2: () => void,
  transitionLength: number,
  func?: (n: number) => number
): Promise<void> {
  return new Promise((resolve) => {
    if (transitionLength == 0) {
      callback2();
      resolve();
    } else {
      let prevPercent = 0;
      let prevTime = Date.now();
      const step = (t: number, f: (n: number) => number) => {
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
        } else {
          callback2();
          resolve();
        }
      };
      step(0, func ? func : linearStep);
    }
  });
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothStep(t: number) {
  const v1 = t * t;
  const v2 = 1 - (1 - t) * (1 - t);
  return lerp(v1, v2, t);
}

export function linearStep(n: number) {
  return n;
}
