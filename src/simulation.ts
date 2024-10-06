import { vec3 } from 'wgpu-matrix';
import { Instance, SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc } from './types.js';
import { Color, matrix4, transitionValues, vector2, vector3 } from './utils.js';
import {
  buildDepthTexture,
  buildMultisampleTexture,
  updateProjectionMatrix,
  getVertexAndIndexSize,
  updateOrthoProjectionMatrix,
  updateWorldProjectionMatrix,
  CachedArray,
  addToScene,
  removeSceneObj,
  removeSceneId
} from './internalUtils.js';
import { Settings } from './settings.js';
import { MemoBuffer } from './buffers.js';
import { globalInfo, logger } from './globals.js';

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
export const worldProjectionMatrix = matrix4();
export const orthogonalMatrix = matrix4();

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
  private scene: SimulationElement3d[] = [];
  private fittingElement = false;
  private running = true;
  private initialized = false;
  private resizeEvents: ((width: number, height: number) => void)[];
  private frameRateView: FrameRateView;
  private transparentElements: CachedArray<SimulationElement3d>;
  private vertexBuffer: MemoBuffer;
  private indexBuffer: MemoBuffer;

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
    this.indexBuffer = new MemoBuffer(GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST, 0);
  }

  private handleCanvasResize(parent: HTMLElement) {
    if (this.fittingElement) {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      this.setCanvasSize(width, height);
    }
  }

  on<K extends keyof HTMLElementEventMap>(
    event: K,
    cb: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ) {
    if (!this.canvasRef) return;
    this.canvasRef.addEventListener(event, cb, options);
  }

  onResize(cb: (width: number, height: number) => void) {
    this.resizeEvents.push(cb);
  }

  getWidth() {
    return this.canvasRef?.width || 0;
  }

  getHeight() {
    return this.canvasRef?.height || 0;
  }

  add(el: SimulationElement3d, id?: string) {
    addToScene(this.scene, el, id);
  }

  remove(el: SimulationElement3d) {
    removeSceneObj(this.scene, el);
  }

  removeId(id: string) {
    removeSceneId(this.scene, id);
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

    updateWorldProjectionMatrix(worldProjectionMatrix, projMat);
    updateOrthoProjectionMatrix(orthogonalMatrix, camera.getScreenSize());

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
      if (!canvas) return;

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
        updateWorldProjectionMatrix(worldProjectionMatrix, projMat);

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
        updateOrthoProjectionMatrix(orthogonalMatrix, camera.getScreenSize());
        updateWorldProjectionMatrix(worldProjectionMatrix, projMat);
      }

      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      const [totalVerticesSize, totalIndexSize] = getVertexAndIndexSize(this.scene);
      this.vertexBuffer.setSize(totalVerticesSize * 4);
      this.indexBuffer.setSize(totalIndexSize * 4);
      this.transparentElements.reset();

      const [opaqueVertexOffset, opaqueIndexOffset] = this.renderScene(
        device,
        passEncoder,
        this.vertexBuffer.getBuffer(),
        this.indexBuffer.getBuffer(),
        0,
        0,
        this.scene,
        this.scene.length,
        diff,
        false
      );

      this.renderScene(
        device,
        passEncoder,
        this.vertexBuffer.getBuffer(),
        this.indexBuffer.getBuffer(),
        opaqueVertexOffset,
        opaqueIndexOffset,
        this.transparentElements.getArray(),
        this.transparentElements.length,
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
    indexBuffer: GPUBuffer,
    startVertexOffset: number,
    startIndexOffset: number,
    scene: SimulationElement3d[],
    numElements: number,
    diff: number,
    transparent: boolean
  ) {
    let vertexOffset = startVertexOffset;
    let indexOffset = startIndexOffset;

    for (let i = 0; i < numElements; i++) {
      const obj = scene[i];

      if (!transparent && obj.isTransparent()) {
        this.transparentElements.add(obj);
        continue;
      }

      if (obj.hasChildren()) {
        const childObjects = obj.getChildrenInfos();
        const [vertexDiff, indexDiff] = this.renderScene(
          device,
          passEncoder,
          vertexBuffer,
          indexBuffer,
          vertexOffset,
          indexOffset,
          childObjects,
          childObjects.length,
          diff,
          transparent
        );
        vertexOffset += vertexDiff;
        indexOffset += indexDiff;
      }

      if (obj.isEmpty) continue;

      const vertices = obj.getVertexBuffer();
      const indices = obj.getIndexBuffer();

      device.queue.writeBuffer(
        vertexBuffer,
        vertexOffset,
        vertices.buffer,
        vertices.byteOffset,
        vertices.byteLength
      );

      device.queue.writeBuffer(
        indexBuffer,
        indexOffset,
        indices.buffer,
        indices.byteOffset,
        indices.byteLength
      );

      passEncoder.setVertexBuffer(0, vertexBuffer, vertexOffset, vertices.byteLength);
      passEncoder.setIndexBuffer(indexBuffer, 'uint32', indexOffset, indices.byteLength);

      passEncoder.setPipeline(obj.getPipeline());

      obj.writeBuffers();
      const instances = obj.isInstance ? (obj as Instance<SimulationElement3d>).getNumInstances() : 1;
      const bindGroups = obj.getShader().getBindGroups(obj);
      for (let i = 0; i < bindGroups.length; i++) {
        passEncoder.setBindGroup(i, bindGroups[i]);
      }

      passEncoder.drawIndexed(indices.length, instances);

      vertexOffset += vertices.byteLength;
      indexOffset += indices.byteLength;
    }

    return [vertexOffset - startVertexOffset, indexOffset - startIndexOffset] as const;
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
