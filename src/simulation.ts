import { vec3 } from 'wgpu-matrix';
import { Instance, SimulationElement, SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc, PipelineGroup, RenderInfo } from './types.js';
import { BUF_LEN } from './constants.js';
import { Color, transitionValues, vector2, vector3 } from './utils.js';
import { BlankGeometry } from './geometry.js';
import {
  applyElementToScene,
  buildDepthTexture,
  buildMultisampleTexture,
  buildProjectionMatrix,
  createPipeline,
  getOrthoMatrix,
  getTotalVertices,
  getTransformationMatrix,
  logger
} from './internalUtils.js';

const shader = `
struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
  orthoProjectionMatrix : mat4x4<f32>
}
 
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

@group(0) @binding(1) var<storage, read> instanceMatrices : array<mat4x4f, 10>;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragColor : vec4<f32>,
  @location(2) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main_3d(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
  @location(2) uv : vec2<f32>,
  @location(3) drawingInstance: f32
) -> VertexOutput {
  var output : VertexOutput;

  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = position;
  output.fragColor = color;
  return output;
}

@vertex
fn vertex_main_2d(
  @builtin(instance_index) instanceIdx : u32,
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>,
  @location(2) uv : vec2<f32>,
  @location(3) drawingInstance: f32
) -> VertexOutput {
  var output: VertexOutput;

  if (drawingInstance == 1) {
    let transformedPos = instanceMatrices[instanceIdx] * position;
    output.Position = uniforms.orthoProjectionMatrix * transformedPos;
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
  private el: HTMLDivElement;
  private fpsBuffer: number[] = [];
  private maxFpsBufferLength = 8;
  constructor(show: boolean) {
    this.el = document.createElement('div');
    this.el.classList.add('simjs-frame-rate');

    const style = document.createElement('style');
    style.innerHTML = simjsFrameRateCss;

    if (show) {
      document.head.appendChild(style);
      document.body.appendChild(this.el);
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
    this.el.innerHTML = `${fps} FPS`;
  }
}

export class Simulation {
  canvasRef: HTMLCanvasElement | null = null;
  private bgColor: Color = new Color(255, 255, 255);
  private scene: SimulationElement<any>[] = [];
  private fittingElement = false;
  private running = true;
  private frameRateView: FrameRateView;
  private camera: Camera;
  private pipelines: PipelineGroup | null;
  private renderInfo: RenderInfo | null;

  constructor(
    idOrCanvasRef: string | HTMLCanvasElement,
    camera: Camera | null = null,
    showFrameRate = false
  ) {
    if (typeof idOrCanvasRef === 'string') {
      const ref = document.getElementById(idOrCanvasRef) as HTMLCanvasElement | null;
      if (ref !== null) this.canvasRef = ref;
      else throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
    } else if (idOrCanvasRef instanceof HTMLCanvasElement) {
      this.canvasRef = idOrCanvasRef;
    } else {
      throw logger.error(`Canvas ref/id provided is invalid`);
    }

    const parent = this.canvasRef.parentElement;

    if (!camera) this.camera = new Camera(vector3());
    else this.camera = camera;

    if (parent === null) throw logger.error('Canvas parent is null');

    addEventListener('resize', () => {
      if (this.fittingElement) {
        const width = parent.clientWidth;
        const height = parent.clientHeight;

        this.setCanvasSize(width, height);
      }
    });

    this.renderInfo = null;
    this.pipelines = null;
    this.frameRateView = new FrameRateView(showFrameRate);
    this.frameRateView.updateFrameRate(1);
  }

  add(el: SimulationElement<any>) {
    applyElementToScene(this.scene, el);
  }

  setCanvasSize(width: number, height: number) {
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
      if (!adapter) throw logger.error('Adapter is null');

      const ctx = this.canvasRef.getContext('webgpu');
      if (!ctx) throw logger.error('Context is null');

      const device = await adapter.requestDevice();
      this.propagateDevice(device);

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

  setBackground(color: Color) {
    this.bgColor = color;
  }

  private propagateDevice(device: GPUDevice) {
    for (let i = 0; i < this.scene.length; i++) {
      if ((this.scene[i] as Instance<any>).isInstance) {
        (this.scene[i] as Instance<any>).setDevice(device);
      }
    }
  }

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

    const uniformBufferSize = 4 * 16 + 4 * 16 + 4 * 2 + 8; // 4x4 matrix + 4x4 matrix + vec2<f32> + 8 bc 144 is cool
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const instanceBuffer = device.createBuffer({
      size: 16 * 10 * 4,
      usage: GPUBufferUsage.STORAGE
    });

    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        } as GPUBindGroupLayoutEntry,
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'read-only-storage'
          }
        } as GPUBindGroupLayoutEntry
      ]
    });

    this.renderInfo = {
      uniformBuffer,
      bindGroupLayout,
      instanceBuffer
    };

    this.pipelines = {
      triangleList2d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_2d',
        'triangle-list'
      ),
      triangleStrip2d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_2d',
        'triangle-strip'
      ),
      lineStrip2d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_2d',
        'line-strip'
      ),
      triangleList3d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_3d',
        'triangle-list'
      ),
      triangleStrip3d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_3d',
        'triangle-strip'
      ),
      lineStrip3d: createPipeline(
        device,
        shaderModule,
        bindGroupLayout,
        presentationFormat,
        'vertex_main_3d',
        'line-strip'
      )
    };

    const uniformBindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: uniformBuffer
          }
        },
        {
          binding: 1,
          resource: {
            buffer: instanceBuffer
          }
        }
      ]
    });

    const colorAttachment: GPURenderPassColorAttachment = {
      // @ts-ignore
      view: undefined, // Assigned later

      clearValue: this.bgColor.toObject(),
      loadOp: 'clear',
      storeOp: 'store'
    };

    let aspect = canvas.width / canvas.height;
    let projectionMatrix = buildProjectionMatrix(aspect);
    let modelViewProjectionMatrix: Float32Array;
    let orthoMatrix: Float32Array;

    const updateModelViewProjectionMatrix = () => {
      modelViewProjectionMatrix = getTransformationMatrix(
        this.camera.getPos(),
        this.camera.getRotation(),
        projectionMatrix
      );
    };

    updateModelViewProjectionMatrix();

    const updateOrthoMatrix = () => {
      orthoMatrix = getOrthoMatrix(this.camera.getScreenSize());
    };

    updateOrthoMatrix();

    let multisampleTexture = buildMultisampleTexture(device, ctx, canvas.width, canvas.height);
    let depthTexture = buildDepthTexture(device, canvas.width, canvas.height);

    const renderPassDescriptor: GPURenderPassDescriptor = {
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

    const frame = async () => {
      if (!this.running || !canvas) return;

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

        multisampleTexture = buildMultisampleTexture(device, ctx, screenSize[0], screenSize[1]);
        depthTexture = buildDepthTexture(device, screenSize[0], screenSize[1]);

        renderPassDescriptor.depthStencilAttachment!.view = depthTexture.createView();
      }

      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].view = multisampleTexture.createView();
      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].resolveTarget = ctx.getCurrentTexture().createView();

      if (this.camera.hasUpdated()) {
        updateOrthoMatrix();
        updateModelViewProjectionMatrix();
      }

      device.queue.writeBuffer(
        uniformBuffer,
        0,
        modelViewProjectionMatrix.buffer,
        modelViewProjectionMatrix.byteOffset,
        modelViewProjectionMatrix.byteLength
      );

      device.queue.writeBuffer(
        uniformBuffer,
        4 * 16, // 4x4 matrix
        orthoMatrix.buffer,
        orthoMatrix.byteOffset,
        orthoMatrix.byteLength
      );

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.setPipeline(this.pipelines!.triangleList3d);
      passEncoder.setBindGroup(0, uniformBindGroup);

      this.renderScene(device, passEncoder, this.scene);

      this.camera.updateConsumed();

      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    };

    requestAnimationFrame(frame);
  }

  private async renderScene(
    device: GPUDevice,
    passEncoder: GPURenderPassEncoder,
    scene: SimulationElement[]
  ) {
    if (this.pipelines === null) return;

    let totalVertices = getTotalVertices(scene);

    const vertexBuffer = device.createBuffer({
      size: totalVertices * 4 * BUF_LEN,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    let currentOffset = 0;

    for (let i = 0; i < scene.length; i++) {
      if ((scene[i] as SceneCollection).isCollection) {
        this.renderScene(device, passEncoder, (scene[i] as SceneCollection).getScene());
        continue;
      }

      const buffer = new Float32Array(scene[i].getBuffer(this.camera));
      const vertexCount = buffer.length / BUF_LEN;

      device.queue.writeBuffer(vertexBuffer, currentOffset, buffer);
      vertexBuffer.unmap();

      const is3d = Boolean((scene[i] as SimulationElement3d).is3d);

      if (scene[i].isWireframe()) {
        if (is3d) {
          passEncoder.setPipeline(this.pipelines.lineStrip3d);
        } else {
          passEncoder.setPipeline(this.pipelines.lineStrip2d);
        }
      } else {
        const type = scene[i].getGeometryType();

        if (type === 'strip') {
          if (is3d) {
            passEncoder.setPipeline(this.pipelines.triangleStrip3d);
          } else {
            passEncoder.setPipeline(this.pipelines.triangleStrip2d);
          }
        } else if (type === 'list') {
          if (is3d) {
            passEncoder.setPipeline(this.pipelines.triangleList3d);
          } else {
            passEncoder.setPipeline(this.pipelines.triangleList2d);
          }
        }
      }

      let instances = 1;

      if ((scene[i] as Instance<any>).isInstance) {
        instances = (scene[i] as Instance<any>).getNumInstances();
        const buf = (scene[i] as Instance<any>).getMatrixBuffer();

        if (buf && this.renderInfo) {
          const uniformBindGroup = device.createBindGroup({
            layout: this.renderInfo.bindGroupLayout,
            entries: [
              {
                binding: 0,
                resource: {
                  buffer: this.renderInfo.uniformBuffer
                }
              },
              {
                binding: 1,
                resource: {
                  buffer: buf
                }
              }
            ]
          });

          passEncoder.setBindGroup(0, uniformBindGroup);
        }
      }

      passEncoder.setVertexBuffer(0, vertexBuffer, currentOffset, buffer.byteLength);
      passEncoder.draw(vertexCount, instances, 0, 0);

      currentOffset += buffer.byteLength;
    }
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

export class SceneCollection extends SimulationElement3d {
  protected geometry: BlankGeometry;
  private name: string;
  private scene: SimulationElement[];
  readonly isCollection = true;

  constructor(name: string) {
    super(vector3());

    this.wireframe = false;

    this.name = name;
    this.scene = [];
    this.geometry = new BlankGeometry();
  }

  setWireframe(_: boolean) {}

  getName() {
    return this.name;
  }

  getScene() {
    return this.scene;
  }

  add(el: SimulationElement<any>) {
    applyElementToScene(this.scene, el);
  }

  empty() {
    this.scene = [];
  }

  getSceneBuffer(camera: Camera) {
    return this.scene.map((item) => item.getBuffer(camera)).flat();
  }

  getWireframe(camera: Camera) {
    return this.getSceneBuffer(camera);
  }

  getTriangles(camera: Camera) {
    return this.getSceneBuffer(camera);
  }

  protected updateMatrix(camera: Camera): void {
    this.defaultUpdateMatrix(camera);
  }
}

export class Camera {
  private pos: Vector3;
  private rotation: Vector3;
  private aspectRatio = 1;
  private updated: boolean;
  private screenSize = vector2();

  constructor(pos: Vector3, rotation = vector3()) {
    this.pos = pos;
    this.updated = false;
    this.rotation = rotation;
  }

  setScreenSize(size: Vector2) {
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

  move(amount: Vector3, t = 0, f?: LerpFunc) {
    const initial = vector3();
    vec3.clone(this.pos, initial);

    return transitionValues(
      (p) => {
        const x = amount[0] * p;
        const y = amount[1] * p;
        const z = amount[2] * p;
        const diff = vector3(x, y, z);
        vec3.add(this.pos, diff, this.pos);
      },
      () => {
        vec3.add(initial, amount, this.pos);
      },
      t,
      f
    );
  }

  moveTo(pos: Vector3, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec3.sub(pos, this.pos, diff);

    return transitionValues(
      (p) => {
        const x = diff[0] * p;
        const y = diff[1] * p;
        const z = diff[2] * p;
        const amount = vector3(x, y, z);
        vec3.add(this.pos, amount, this.pos);
      },
      () => {
        vec3.clone(pos, this.pos);
      },
      t,
      f
    );
  }

  rotateTo(value: Vector3, t = 0, f?: LerpFunc) {
    const diff = vec3.clone(value);
    vec3.sub(diff, diff, this.rotation);

    return transitionValues(
      (p) => {
        const x = diff[0] * p;
        const y = diff[1] * p;
        const z = diff[2] * p;
        vec3.add(this.rotation, this.rotation, vector3(x, y, z));
        this.updated = true;
      },
      () => {
        this.rotation = value;
      },
      t,
      f
    );
  }

  rotate(amount: Vector3, t = 0, f?: LerpFunc) {
    const initial = vector3();
    vec3.clone(this.rotation, initial);

    return transitionValues(
      (p) => {
        const x = amount[0] * p;
        const y = amount[1] * p;
        const z = amount[2] * p;
        vec3.add(this.rotation, vector3(x, y, z), this.rotation);
        this.updated = true;
      },
      () => {
        vec3.add(initial, amount, this.rotation);
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

  getAspectRatio() {
    return this.aspectRatio;
  }
}
