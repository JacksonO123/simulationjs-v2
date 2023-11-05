import { mat4, vec3 } from 'wgpu-matrix';
import { SimulationElement, vec3From, vec3ToPixelRatio } from './graphics.js';
export * from './graphics.js';

export type LerpFunc = (n: number) => number;

export const vertexSize = 40; // 4 * 10
export const colorOffset = 16; // 4 * 4
export const uvOffset = 32; // 4 * 8

const shader = `
struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
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

@fragment
fn fragment_main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  // return fragColor;
  return fragPosition;
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
  // private bgColor: Color = new Color(255, 255, 255);
  private scene: SimulationElement[] = [];
  private fittingElement = false;
  // private running = true;
  private frameRateView: FrameRateView;
  private camera: Camera;
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

      if (!camera) {
        this.camera = new Camera(vec3From());
      } else {
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
  // stop() {
  //   this.running = false;
  // }
  // setBackground(color: Color) {
  //   this.bgColor = color;
  // }
  render(device: GPUDevice, ctx: GPUCanvasContext) {
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

      // Enable depth testing so that the fragment closest to the camera
      // is rendered in front.
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });

    const uniformBufferSize = 4 * 16; // 4x4 matrix
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

    const colorAttachment: GPURenderPassColorAttachment = {
      // @ts-ignore
      view: undefined, // Assigned later

      clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
      // clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    };

    let aspect = canvas.width / canvas.height;
    let projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);
    const modelViewProjectionMatrix = mat4.create();

    function getTransformationMatrix(sim: Simulation) {
      const viewMatrix = mat4.identity();
      let camPos = vec3From();
      vec3.clone(sim.camera.getPos(), camPos);
      vec3.scale(camPos, -1, camPos);
      mat4.translate(viewMatrix, camPos, viewMatrix);
      // const now = Date.now() / 1000;
      // mat4.rotate(viewMatrix, vec3.fromValues(Math.sin(now), Math.cos(now), 0), 1, viewMatrix);

      mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

      return modelViewProjectionMatrix as Float32Array;
    }

    function frame(sim: Simulation) {
      if (!canvas) return;
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

      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [colorAttachment],
        depthStencilAttachment: {
          view: depthTexture.createView(),

          depthClearValue: 1.0,
          depthLoadOp: 'clear',
          depthStoreOp: 'store'
        }
      };

      const transformationMatrix = getTransformationMatrix(sim);
      device.queue.writeBuffer(
        uniformBuffer,
        0,
        transformationMatrix.buffer,
        transformationMatrix.byteOffset,
        transformationMatrix.byteLength
      );

      const tempVertexArr: number[] = [];
      let vertexCount = 0;

      sim.scene.forEach((obj) => {
        // translate and rotate buffer or smth idk
        tempVertexArr.push(...obj.getBuffer(false));
        vertexCount += obj.getTriangleCount();
      });

      const vertexArr = new Float32Array(tempVertexArr);

      const verticesBuffer = device.createBuffer({
        size: vertexArr.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
      });
      new Float32Array(verticesBuffer.getMappedRange()).set(vertexArr);
      verticesBuffer.unmap();

      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, uniformBindGroup);
      passEncoder.setVertexBuffer(0, verticesBuffer);
      passEncoder.draw(vertexCount);
      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);

      requestAnimationFrame(() => frame(sim));
    }
    requestAnimationFrame(() => frame(this));

    // let prev = Date.now() - 10;
    // let prevFps = 0;
    // (function renderLoop(c: Simulation) {
    //   const now = Date.now();
    //   const diff = Math.max(now - prev, 1);
    //   prev = now;

    //   const fps = 1000 / diff;

    //   if (fps === prevFps) {
    //     c.frameRateView.updateFrameRate(fps);
    //   }

    //   prevFps = fps;

    //   if (c.running) {
    //     requestAnimationFrame(() => renderLoop(c));
    //   }
    // })(this);
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
  private aspectRatio = 1;
  private updated: boolean;
  constructor(pos: vec3) {
    this.pos = pos;
    vec3ToPixelRatio(this.pos);
    this.updated = false;
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
