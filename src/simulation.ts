import { vec3 } from 'wgpu-matrix';
import { EmptyElement, Instance, SimulationElement3d } from './graphics.js';
import type {
  Vector2,
  Vector3,
  LerpFunc,
  PipelineGroup,
  RenderInfo,
  AnySimulationElement,
  VertexParamGeneratorInfo,
  ShaderInfo,
  VertexParamInfo,
  BindGroupInfo,
  BindGroupValue
} from './types.js';
import { BUF_LEN, worldProjMatOffset } from './constants.js';
import { Color, matrix4, transitionValues, vector2, vector3 } from './utils.js';
import { BlankGeometry } from './geometry.js';
import createUniformBindGroup, {
  SimSceneObjInfo,
  buildDepthTexture,
  buildMultisampleTexture,
  updateProjectionMatrix,
  createPipeline,
  getTotalVertices,
  logger,
  removeObjectId,
  updateOrthoProjectionMatrix,
  updateWorldProjectionMatrix,
  globalInfo,
  CachedArray,
  createDefaultPipelines
} from './internalUtils.js';
import { Settings } from './settings.js';
import { defaultShader } from './shaders.js';
import { MemoBuffer } from './buffers.js';

const simjsFrameRateCss = `.simjs-frame-rate {
  position: absolute;
  top: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  z-index: 1000;
  font-family: monospace;
  font-size: 16px;
}`;

class FrameRateView {
  private el: HTMLDivElement;
  private fpsBuffer: number[] = [];
  private maxFpsBufferLength = 8;
  private prevAvg = 0;
  private showing: boolean;

  constructor(show: boolean) {
    this.el = document.createElement('div');
    this.el.classList.add('simjs-frame-rate');
    this.showing = show;

    const style = document.createElement('style');
    style.innerHTML = simjsFrameRateCss;

    if (this.showing) {
      document.head.appendChild(style);
      document.body.appendChild(this.el);
    }
  }

  isActive() {
    return this.showing;
  }

  updateFrameRate(num: number) {
    if (this.fpsBuffer.length < this.maxFpsBufferLength) {
      this.fpsBuffer.push(num);
    } else {
      this.fpsBuffer.shift();
      this.fpsBuffer.push(num);
    }

    const fps = Math.round(this.fpsBuffer.reduce((acc, curr) => acc + curr, 0) / this.fpsBuffer.length);
    if (fps !== this.prevAvg) {
      this.el.innerHTML = `${fps} FPS`;
      this.prevAvg = fps;
    }
  }
}

let aspectRatio = 0;
const projMat = matrix4();
const worldProjMat = matrix4();
const orthoMatrix = matrix4();

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

export let camera = new Camera(vector3());

export class Simulation extends Settings {
  canvasRef: HTMLCanvasElement | null = null;
  private bgColor: Color = new Color(255, 255, 255);
  private scene: SimSceneObjInfo[] = [];
  private fittingElement = false;
  private running = true;
  private initialized = false;
  private pipelines: PipelineGroup | null = null;
  private renderInfo: RenderInfo | null = null;
  private resizeEvents: ((width: number, height: number) => void)[];
  private frameRateView: FrameRateView;
  private transparentElements: CachedArray<SimSceneObjInfo>;
  private vertexBuffer: MemoBuffer;

  constructor(
    idOrCanvasRef: string | HTMLCanvasElement,
    sceneCamera: Camera | null = null,
    showFrameRate = false
  ) {
    super();

    if (typeof idOrCanvasRef === 'string') {
      const ref = document.getElementById(idOrCanvasRef) as HTMLCanvasElement | null;
      if (!ref) throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
      this.canvasRef = ref;
    } else if (idOrCanvasRef instanceof HTMLCanvasElement) {
      this.canvasRef = idOrCanvasRef;
    } else throw logger.error(`Canvas ref/id provided is invalid`);

    const parent = this.canvasRef.parentElement;

    if (sceneCamera) {
      camera = sceneCamera;
    }

    if (parent === null) throw logger.error('Canvas parent is null');

    this.resizeEvents = [];
    addEventListener('resize', () => {
      this.handleCanvasResize(parent);
    });

    this.frameRateView = new FrameRateView(showFrameRate);
    this.frameRateView.updateFrameRate(1);

    this.transparentElements = new CachedArray();

    this.vertexBuffer = new MemoBuffer(GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, 0);
  }

  private handleCanvasResize(parent: HTMLElement) {
    if (this.fittingElement) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      this.setCanvasSize(width, height);
    }
  }

  onResize(cb: (width: number, height: number) => void) {
    this.resizeEvents.push(cb);
  }

  getWidth() {
    return (this.canvasRef?.width || 0) / devicePixelRatio;
  }

  getHeight() {
    return (this.canvasRef?.height || 0) / devicePixelRatio;
  }

  add(el: AnySimulationElement, id?: string) {
    if (el instanceof SimulationElement3d) {
      const obj = new SimSceneObjInfo(el, id);
      this.scene.unshift(obj);
    } else {
      throw logger.error('Cannot add invalid SimulationElement');
    }
  }

  remove(el: SimulationElement3d) {
    for (let i = 0; i < this.scene.length; i++) {
      if (this.scene[i].getObj() === el) {
        this.scene.splice(i, 1);
        break;
      }
    }
  }

  removeId(id: string) {
    removeObjectId(this.scene, id);
  }

  /**
   * @param lifetime - ms
   */
  setLifetime(el: AnySimulationElement, lifetime: number) {
    for (let i = 0; i < this.scene.length; i++) {
      if (this.scene[i].getObj() === el) this.scene[i].setLifetime(lifetime);
    }
  }

  private applyCanvasSize(width: number, height: number) {
    if (this.canvasRef === null) return;

    this.canvasRef.width = width * devicePixelRatio;
    this.canvasRef.height = height * devicePixelRatio;
    this.canvasRef.style.width = width + 'px';
    this.canvasRef.style.height = height + 'px';
  }

  setCanvasSize(width: number, height: number) {
    this.applyCanvasSize(width, height);

    for (let i = 0; i < this.resizeEvents.length; i++) {
      this.resizeEvents[i](width, height);
    }
  }

  start() {
    if (this.initialized) {
      this.running = true;
      return;
    }

    (async () => {
      if (this.canvasRef === null) return;

      this.initialized = true;
      this.running = true;

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw logger.error('Adapter is null');

      const ctx = this.canvasRef.getContext('webgpu');
      if (!ctx) throw logger.error('Context is null');

      const device = await adapter.requestDevice();
      globalInfo.setDevice(device);

      const screenSize = vector2(this.canvasRef.width, this.canvasRef.height);
      camera.setScreenSize(screenSize);

      const canvas = this.canvasRef;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

      ctx.configure({
        device,
        format: presentationFormat,
        alphaMode: 'opaque'
      });

      this.pipelines = createDefaultPipelines(defaultShader);

      const instanceBuffer = device.createBuffer({
        size: 10 * 4 * 16,
        usage: GPUBufferUsage.STORAGE
      });

      this.renderInfo = {
        instanceBuffer
      };

      this.render(device, ctx, canvas);
    })();
  }

  stop() {
    this.running = false;
  }

  setBackground(color: Color) {
    this.bgColor = color;
  }

  getScene() {
    return this.scene;
  }

  getSceneObjects() {
    return this.scene.map((item) => item.getObj());
  }

  private render(device: GPUDevice, ctx: GPUCanvasContext, canvas: HTMLCanvasElement) {
    const colorAttachment: GPURenderPassColorAttachment = {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      view: undefined, // Assigned later

      clearValue: this.bgColor.toObject(),
      loadOp: 'clear',
      storeOp: 'store'
    };

    const newAspectRatio = canvas.width / canvas.height;
    if (newAspectRatio !== aspectRatio) {
      updateProjectionMatrix(projMat, newAspectRatio);
      aspectRatio = newAspectRatio;
    }

    updateWorldProjectionMatrix(worldProjMat, projMat);
    updateOrthoProjectionMatrix(orthoMatrix, camera.getScreenSize());

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
      if (!canvas || !this.renderInfo) return;

      requestAnimationFrame(frame);

      if (!this.running) return;

      const now = Date.now();
      const diff = Math.max(now - prev, 1);
      prev = now;
      const fps = 1000 / diff;

      if (this.frameRateView.isActive() && fps === prevFps) {
        this.frameRateView.updateFrameRate(fps);
      }

      prevFps = fps;

      const screenSize = camera.getScreenSize();

      if (screenSize[0] !== canvas.width || screenSize[1] !== canvas.height) {
        camera.setScreenSize(vector2(canvas.width, canvas.height));
        screenSize[0] = canvas.width;
        screenSize[1] = canvas.height;

        aspectRatio = camera.getAspectRatio();
        updateProjectionMatrix(projMat, aspectRatio);
        updateWorldProjectionMatrix(worldProjMat, projMat);

        multisampleTexture = buildMultisampleTexture(device, ctx, screenSize[0], screenSize[1]);
        depthTexture = buildDepthTexture(device, screenSize[0], screenSize[1]);

        renderPassDescriptor.depthStencilAttachment!.view = depthTexture.createView();
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].view = multisampleTexture.createView();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      renderPassDescriptor.colorAttachments[0].resolveTarget = ctx.getCurrentTexture().createView();

      if (camera.hasUpdated()) {
        updateOrthoProjectionMatrix(orthoMatrix, camera.getScreenSize());
        updateWorldProjectionMatrix(worldProjMat, projMat);
      }

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      const totalVertices = getTotalVertices(this.scene);
      this.vertexBuffer.setSize(totalVertices * 4 * BUF_LEN);
      this.transparentElements.reset();

      const opaqueOffset = this.renderScene(
        device,
        passEncoder,
        this.vertexBuffer.getBuffer(),
        this.scene,
        this.scene.length,
        0,
        diff,
        false
      );

      this.renderScene(
        device,
        passEncoder,
        this.vertexBuffer.getBuffer(),
        this.transparentElements.getArray(),
        this.transparentElements.length,
        opaqueOffset,
        diff,
        true
      );

      camera.updateConsumed();

      passEncoder.end();
      device.queue.submit([commandEncoder.finish()]);
    };

    requestAnimationFrame(frame);
  }

  private renderScene(
    device: GPUDevice,
    passEncoder: GPURenderPassEncoder,
    vertexBuffer: GPUBuffer,
    scene: SimSceneObjInfo[],
    numElements: number,
    startOffset: number,
    diff: number,
    transparent: boolean,
    shaderInfo?: ShaderInfo
  ) {
    if (this.pipelines === null) return 0;

    let currentOffset = startOffset;
    const toRemove: number[] = [];

    for (let i = 0; i < numElements; i++) {
      const sceneObj = scene[i];
      const lifetime = sceneObj.getLifetime();

      if (lifetime !== null) {
        const complete = sceneObj.lifetimeComplete();

        if (complete) {
          toRemove.push(i);
          continue;
        }

        sceneObj.traverseLife(diff);
      }

      const obj = sceneObj.getObj();

      if (!transparent && obj.isTransparent()) {
        this.transparentElements.add(sceneObj);
        continue;
      }

      if (obj.hasChildren()) {
        let shaderInfo: ShaderInfo | undefined = undefined;

        if (obj instanceof ShaderGroup) {
          const pipeline = obj.getPipeline();

          if (pipeline !== null) {
            shaderInfo = {
              pipeline,
              paramGenerator: obj.getVertexParamGenerator(),
              bufferInfo: obj.hasBindGroup()
                ? {
                    buffers: obj.getBindGroupBuffers(device)!,
                    layout: obj.getBindGroupLayout()!
                  }
                : null
            };
          }
        }

        const childObjects = obj.getChildrenInfos();
        currentOffset += this.renderScene(
          device,
          passEncoder,
          vertexBuffer,
          childObjects,
          childObjects.length,
          currentOffset,
          diff,
          transparent,
          shaderInfo
        );
      }

      if (obj.isEmpty) continue;

      const buffer = new Float32Array(obj.getBuffer(shaderInfo?.paramGenerator));
      const bufLen = shaderInfo?.paramGenerator?.bufferSize || BUF_LEN;
      const vertexCount = buffer.length / bufLen;

      device.queue.writeBuffer(
        vertexBuffer,
        currentOffset,
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
      vertexBuffer.unmap();
      passEncoder.setVertexBuffer(0, vertexBuffer, currentOffset, buffer.byteLength);

      const modelMatrix = obj.getModelMatrix();
      const uniformBuffer = obj.getUniformBuffer(modelMatrix);

      const projBuf = obj.is3d ? worldProjMat : orthoMatrix;
      device.queue.writeBuffer(
        uniformBuffer,
        worldProjMatOffset,
        projBuf.buffer,
        projBuf.byteOffset,
        projBuf.byteLength
      );

      if (shaderInfo) {
        passEncoder.setPipeline(shaderInfo.pipeline);
      } else if (obj.isWireframe()) {
        if (obj.isTransparent()) passEncoder.setPipeline(this.pipelines.lineStripTransparent);
        else passEncoder.setPipeline(this.pipelines.lineStrip);
      } else {
        const type = obj.getGeometryType();

        // must be exhaustive
        if (type === 'strip') {
          if (obj.isTransparent()) passEncoder.setPipeline(this.pipelines.triangleStripTransparent);
          else passEncoder.setPipeline(this.pipelines.triangleStrip);
        } else if (type === 'list') {
          if (obj.isTransparent()) passEncoder.setPipeline(this.pipelines.triangleListTransparent);
          else passEncoder.setPipeline(this.pipelines.triangleList);
        }
      }

      let instances = 1;

      if (this.renderInfo) {
        let instanceBuffer: GPUBuffer | undefined;

        if (obj.isInstance) {
          instances = (obj as Instance<AnySimulationElement>).getNumInstances();
          instanceBuffer =
            (obj as Instance<AnySimulationElement>).getMatrixBuffer() ?? this.renderInfo.instanceBuffer;
        } else {
          instanceBuffer = this.renderInfo.instanceBuffer;
        }

        const uniformBindGroup = createUniformBindGroup(defaultShader, [uniformBuffer, instanceBuffer]);

        passEncoder.setBindGroup(0, uniformBindGroup);
      }

      if (shaderInfo && shaderInfo.bufferInfo) {
        const bindGroupEntries = shaderInfo.bufferInfo.buffers.map(
          (buffer, index) =>
            ({
              binding: index,
              resource: {
                buffer
              }
            }) as GPUBindGroupEntry
        );
        const bindGroup = device.createBindGroup({
          layout: shaderInfo.bufferInfo.layout,
          entries: bindGroupEntries
        });

        passEncoder.setBindGroup(1, bindGroup);
      }

      // TODO maybe switch to drawIndexed
      passEncoder.draw(vertexCount, instances, 0, 0);

      currentOffset += buffer.byteLength;
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.remove(scene.at(i)!.getObj());
    }

    return currentOffset - startOffset;
  }

  fitElement() {
    if (this.canvasRef === null) return;

    this.fittingElement = true;
    const parent = this.canvasRef.parentElement;

    if (parent !== null) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      this.setCanvasSize(width, height);
    }
  }
}

const defaultShaderCode = `
struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> instanceMatrices: array<mat4x4f>;
`;

export class ShaderGroup extends EmptyElement {
  private code: string;
  private module: GPUShaderModule | null;
  private pipeline: GPURenderPipeline | null;
  private bindGroupLayout: GPUBindGroupLayout | null;
  private topology: GPUPrimitiveTopology;
  private paramGenerator: VertexParamGeneratorInfo;
  private vertexParams: VertexParamInfo[];
  private bindGroup: BindGroupInfo | null;
  private valueBuffers: GPUBuffer[] | null;

  constructor(
    shaderCode: string,
    topology: GPUPrimitiveTopology = 'triangle-list',
    vertexParams: VertexParamInfo[],
    paramGenerator: VertexParamGeneratorInfo,
    bindGroup?: BindGroupInfo
  ) {
    super();

    this.geometry = new BlankGeometry();
    this.code = defaultShaderCode + shaderCode;
    this.module = null;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.bindGroup = bindGroup || null;
    this.topology = topology;
    this.paramGenerator = paramGenerator;
    this.vertexParams = vertexParams;
    this.valueBuffers = null;
  }

  private initPipeline() {
    const device = globalInfo.errorGetDevice();

    this.module = device.createShaderModule({ code: this.code });

    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const bindGroupLayout = defaultShader.getBindGroupLayout();
    const bindGroups = [bindGroupLayout];

    if (this.bindGroup !== null) {
      const entryValues = this.bindGroup.bindings.map(
        (binding, index) =>
          ({
            binding: index,
            visibility: binding.visibility,
            buffer: binding.buffer
          }) as GPUBindGroupLayoutEntry
      );
      this.bindGroupLayout = device.createBindGroupLayout({
        entries: entryValues
      });
      bindGroups.push(this.bindGroupLayout);
    }

    this.pipeline = createPipeline(
      device,
      this.module,
      bindGroups,
      presentationFormat,
      this.topology,
      // TODO possibly make transparent materials
      false,
      this.vertexParams
    );
  }

  getBindGroupLayout() {
    return this.bindGroupLayout;
  }

  getPipeline() {
    if (!this.pipeline) this.initPipeline();
    return this.pipeline;
  }

  getBindGroupBuffers(device: GPUDevice) {
    if (this.bindGroup === null) return null;
    if (device === null) return null;

    const values = this.bindGroup.values();

    if (this.valueBuffers === null) {
      this.valueBuffers = [];

      for (let i = 0; i < values.length; i++) {
        const buffer = this.createBuffer(device, values[i]);
        this.valueBuffers.push(buffer);
      }
    } else {
      for (let i = 0; i < values.length; i++) {
        const arrayConstructor = values[i].array;
        const array = new arrayConstructor(values[i].value);

        if (array.byteLength > this.valueBuffers[i].size) {
          const newBuffer = this.createBuffer(device, values[i]);
          this.valueBuffers[i].destroy();
          this.valueBuffers[i] = newBuffer;
        } else {
          device.queue.writeBuffer(this.valueBuffers[i], 0, array.buffer, array.byteOffset, array.byteLength);
        }
      }
    }

    return this.valueBuffers;
  }

  private createBuffer(device: GPUDevice, value: BindGroupValue) {
    const arrayConstructor = value.array;
    const array = new arrayConstructor(value.value);
    const buffer = device.createBuffer({
      mappedAtCreation: true,
      size: array.byteLength,
      usage: value.usage
    });
    const bufferArr = new arrayConstructor(buffer.getMappedRange());
    bufferArr.set(array);
    buffer.unmap();
    return buffer;
  }

  getVertexParamGenerator() {
    return this.paramGenerator;
  }

  hasBindGroup() {
    return !!this.bindGroup;
  }
}
