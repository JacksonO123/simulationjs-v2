import { vec3 } from 'wgpu-matrix';
import { Instance, SimulationElement3d } from './graphics.js';
import { BUF_LEN, worldProjMatOffset } from './constants.js';
import { Color, matrix4, toSceneObjInfoMany, transitionValues, vector2, vector3 } from './utils.js';
import { BlankGeometry } from './geometry.js';
import { addObject, buildDepthTexture, buildMultisampleTexture, updateProjectionMatrix, createPipeline, getTotalVertices, logger, removeObject, removeObjectId, updateOrthoProjectionMatrix, updateWorldProjectionMatrix, wrapVoidPromise } from './internalUtils.js';
const shader = `
struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> instanceMatrices: array<mat4x4f>;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
  @builtin(instance_index) instanceIdx: u32,
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) drawingInstance: f32
) -> VertexOutput {
  var output: VertexOutput;

  if (drawingInstance == 1) {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * instanceMatrices[instanceIdx] * vec4(position, 1.0);
  } else {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * vec4(position, 1.0);
  }

  output.fragUV = uv;
  output.fragPosition = output.Position;
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
    el;
    fpsBuffer = [];
    maxFpsBufferLength = 8;
    prevAvg = 0;
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
        if (fps !== this.prevAvg) {
            this.el.innerHTML = `${fps} FPS`;
            this.prevAvg = fps;
        }
    }
}
const baseBindGroupLayout = {
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
                type: 'uniform'
            }
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: 'read-only-storage'
            }
        }
    ]
};
let aspectRatio = 0;
const projMat = matrix4();
const worldProjMat = matrix4();
const orthoMatrix = matrix4();
export class Simulation {
    canvasRef = null;
    bgColor = new Color(255, 255, 255);
    scene = [];
    fittingElement = false;
    running = true;
    initialized = false;
    frameRateView;
    camera;
    device = null;
    pipelines = null;
    renderInfo = null;
    resizeEvents;
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
        this.resizeEvents = [];
        addEventListener('resize', () => {
            this.handleCanvasResize(parent);
        });
        this.frameRateView = new FrameRateView(showFrameRate);
        this.frameRateView.updateFrameRate(1);
    }
    handleCanvasResize(parent) {
        if (this.fittingElement) {
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            this.setCanvasSize(width, height);
        }
    }
    onResize(cb) {
        this.resizeEvents.push(cb);
    }
    getWidth() {
        return (this.canvasRef?.width || 0) / devicePixelRatio;
    }
    getHeight() {
        return (this.canvasRef?.height || 0) / devicePixelRatio;
    }
    add(el, id) {
        addObject(this.scene, el, this.device, id);
    }
    remove(el) {
        removeObject(this.scene, el);
    }
    removeId(id) {
        removeObjectId(this.scene, id);
    }
    /**
     * @param lifetime - ms
     */
    setLifetime(el, lifetime) {
        for (let i = 0; i < this.scene.length; i++) {
            if (this.scene[i].getObj() === el)
                this.scene[i].setLifetime(lifetime);
        }
    }
    applyCanvasSize(width, height) {
        if (this.canvasRef === null)
            return;
        this.canvasRef.width = width * devicePixelRatio;
        this.canvasRef.height = height * devicePixelRatio;
        this.canvasRef.style.width = width + 'px';
        this.canvasRef.style.height = height + 'px';
    }
    setCanvasSize(width, height) {
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
            if (this.canvasRef === null)
                return;
            this.initialized = true;
            this.running = true;
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter)
                throw logger.error('Adapter is null');
            const ctx = this.canvasRef.getContext('webgpu');
            if (!ctx)
                throw logger.error('Context is null');
            const device = await adapter.requestDevice();
            this.device = device;
            this.propagateDevice(device);
            ctx.configure({
                device,
                format: 'bgra8unorm'
            });
            const screenSize = vector2(this.canvasRef.width, this.canvasRef.height);
            this.camera.setScreenSize(screenSize);
            this.render(ctx);
        })();
    }
    propagateDevice(device) {
        for (let i = 0; i < this.scene.length; i++) {
            const el = this.scene[i].getObj();
            if (el instanceof SceneCollection) {
                el.setDevice(device);
            }
        }
    }
    stop() {
        this.running = false;
    }
    setBackground(color) {
        this.bgColor = color;
    }
    getScene() {
        return this.scene;
    }
    getSceneObjects() {
        return this.scene.map((item) => item.getObj());
    }
    render(ctx) {
        if (this.canvasRef === null || this.device === null)
            return;
        const canvas = this.canvasRef;
        const device = this.device;
        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        const shaderModule = device.createShaderModule({ code: shader });
        ctx.configure({
            device,
            format: presentationFormat,
            alphaMode: 'premultiplied'
        });
        const instanceBuffer = device.createBuffer({
            size: 10 * 4 * 16,
            usage: GPUBufferUsage.STORAGE
        });
        const bindGroupLayout = device.createBindGroupLayout(baseBindGroupLayout);
        this.renderInfo = {
            bindGroupLayout,
            instanceBuffer,
            vertexBuffer: null
        };
        this.pipelines = {
            triangleList: createPipeline(device, shaderModule, [bindGroupLayout], presentationFormat, 'triangle-list'),
            triangleStrip: createPipeline(device, shaderModule, [bindGroupLayout], presentationFormat, 'triangle-strip'),
            lineStrip: createPipeline(device, shaderModule, [bindGroupLayout], presentationFormat, 'line-strip')
        };
        const colorAttachment = {
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
        updateWorldProjectionMatrix(worldProjMat, projMat, this.camera);
        updateOrthoProjectionMatrix(orthoMatrix, this.camera.getScreenSize());
        let multisampleTexture = buildMultisampleTexture(device, ctx, canvas.width, canvas.height);
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
        const frame = async () => {
            if (!canvas)
                return;
            if (!this.renderInfo)
                return;
            requestAnimationFrame(frame);
            if (!this.running)
                return;
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
                aspectRatio = this.camera.getAspectRatio();
                updateProjectionMatrix(projMat, aspectRatio);
                updateWorldProjectionMatrix(worldProjMat, projMat, this.camera);
                multisampleTexture = buildMultisampleTexture(device, ctx, screenSize[0], screenSize[1]);
                depthTexture = buildDepthTexture(device, screenSize[0], screenSize[1]);
                renderPassDescriptor.depthStencilAttachment.view = depthTexture.createView();
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            renderPassDescriptor.colorAttachments[0].view = multisampleTexture.createView();
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            renderPassDescriptor.colorAttachments[0].resolveTarget = ctx.getCurrentTexture().createView();
            if (this.camera.hasUpdated()) {
                updateOrthoProjectionMatrix(orthoMatrix, this.camera.getScreenSize());
                updateWorldProjectionMatrix(worldProjMat, projMat, this.camera);
            }
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(this.pipelines.triangleList);
            const totalVertices = getTotalVertices(this.scene);
            if (this.renderInfo.vertexBuffer === null ||
                this.renderInfo.vertexBuffer.size / (4 * BUF_LEN) < totalVertices) {
                this.renderInfo.vertexBuffer = device.createBuffer({
                    size: totalVertices * 4 * BUF_LEN,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
                });
            }
            this.renderScene(device, passEncoder, this.renderInfo.vertexBuffer, this.scene, 0, diff);
            this.camera.updateConsumed();
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        };
        requestAnimationFrame(frame);
    }
    renderScene(device, passEncoder, vertexBuffer, scene, startOffset, diff, shaderInfo) {
        if (this.pipelines === null)
            return 0;
        let currentOffset = startOffset;
        const toRemove = [];
        for (let i = 0; i < scene.length; i++) {
            const lifetime = scene[i].getLifetime();
            if (lifetime !== null) {
                const complete = scene[i].lifetimeComplete();
                if (complete) {
                    toRemove.push(i);
                    continue;
                }
                scene[i].traverseLife(diff);
            }
            const obj = scene[i].getObj();
            if (obj instanceof SceneCollection) {
                let shaderInfo = undefined;
                if (obj instanceof ShaderGroup) {
                    const pipeline = obj.getPipeline();
                    if (pipeline !== null) {
                        shaderInfo = {
                            pipeline,
                            paramGenerator: obj.getVertexParamGenerator(),
                            bufferInfo: obj.hasBindGroup()
                                ? {
                                    buffers: obj.getBindGroupBuffers(),
                                    layout: obj.getBindGroupLayout()
                                }
                                : null
                        };
                    }
                }
                currentOffset += this.renderScene(device, passEncoder, vertexBuffer, obj.getScene(), currentOffset, diff, shaderInfo || undefined);
                continue;
            }
            const buffer = new Float32Array(obj.getBuffer(shaderInfo?.paramGenerator));
            const bufLen = shaderInfo?.paramGenerator?.bufferSize || BUF_LEN;
            const vertexCount = buffer.length / bufLen;
            device.queue.writeBuffer(vertexBuffer, currentOffset, buffer);
            vertexBuffer.unmap();
            passEncoder.setVertexBuffer(0, vertexBuffer, currentOffset, buffer.byteLength);
            const modelMatrix = obj.getModelMatrix(this.camera);
            const uniformBuffer = obj.getUniformBuffer(device, modelMatrix);
            if (obj.is3d) {
                device.queue.writeBuffer(uniformBuffer, worldProjMatOffset, worldProjMat.buffer, worldProjMat.byteOffset, worldProjMat.byteLength);
            }
            else {
                device.queue.writeBuffer(uniformBuffer, worldProjMatOffset, orthoMatrix.buffer, orthoMatrix.byteOffset, orthoMatrix.byteLength);
            }
            if (shaderInfo) {
                passEncoder.setPipeline(shaderInfo.pipeline);
            }
            else if (obj.isWireframe()) {
                passEncoder.setPipeline(this.pipelines.lineStrip);
            }
            else {
                const type = obj.getGeometryType();
                if (type === 'strip') {
                    passEncoder.setPipeline(this.pipelines.triangleStrip);
                }
                else if (type === 'list') {
                    passEncoder.setPipeline(this.pipelines.triangleList);
                }
            }
            let instances = 1;
            if (this.renderInfo) {
                let instanceBuffer;
                if (obj instanceof Instance) {
                    instances = obj.getNumInstances();
                    instanceBuffer = obj.getMatrixBuffer(device);
                }
                else {
                    instanceBuffer = this.renderInfo.instanceBuffer;
                }
                const uniformBindGroup = device.createBindGroup({
                    layout: this.renderInfo.bindGroupLayout,
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
                passEncoder.setBindGroup(0, uniformBindGroup);
            }
            if (shaderInfo && shaderInfo.bufferInfo) {
                const bindGroupEntries = shaderInfo.bufferInfo.buffers.map((buffer, index) => ({
                    binding: index,
                    resource: {
                        buffer
                    }
                }));
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
            removeObject(scene, scene[i].getObj());
        }
        return currentOffset - startOffset;
    }
    fitElement() {
        if (this.canvasRef === null)
            return;
        this.fittingElement = true;
        const parent = this.canvasRef.parentElement;
        if (parent !== null) {
            const width = parent.clientWidth;
            const height = parent.clientHeight;
            this.setCanvasSize(width, height);
        }
    }
}
export class SceneCollection extends SimulationElement3d {
    geometry;
    name;
    scene;
    device = null;
    constructor(name) {
        super(vector3());
        this.wireframe = false;
        this.name = name || null;
        this.scene = [];
        this.geometry = new BlankGeometry();
    }
    setWireframe(wireframe) {
        this.wireframe = wireframe;
        for (let i = 0; i < this.scene.length; i++) {
            this.scene[i].getObj().setWireframe(wireframe);
        }
    }
    getName() {
        return this.name;
    }
    getScene() {
        return this.scene;
    }
    setDevice(device) {
        this.device = device;
        this.propagateDevice(device);
    }
    propagateDevice(device) {
        for (let i = 0; i < this.scene.length; i++) {
            const el = this.scene[i].getObj();
            if (el instanceof SceneCollection) {
                el.setDevice(device);
            }
        }
    }
    getVertexCount() {
        let total = 0;
        for (let i = 0; i < this.scene.length; i++) {
            total += this.scene[i].getObj().getVertexCount();
        }
        return total;
    }
    getSceneObjects() {
        return this.scene.map((item) => item.getObj());
    }
    setSceneObjects(newScene) {
        this.scene = toSceneObjInfoMany(newScene);
    }
    setScene(newScene) {
        this.scene = newScene;
    }
    add(el, id) {
        addObject(this.scene, el, this.device, id);
    }
    remove(el) {
        removeObject(this.scene, el);
    }
    removeId(id) {
        removeObjectId(this.scene, id);
    }
    /**
     * @param lifetime - ms
     */
    setLifetime(el, lifetime) {
        for (let i = 0; i < this.scene.length; i++) {
            if (this.scene[i].getObj() === el)
                this.scene[i].setLifetime(lifetime);
        }
    }
    empty() {
        this.scene = [];
    }
    getSceneBuffer() {
        return this.scene.map((item) => item.getObj().getBuffer()).flat();
    }
    getWireframe() {
        return this.getSceneBuffer();
    }
    getTriangles() {
        return this.getSceneBuffer();
    }
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
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
const defaultShaderCode = `
struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> instanceMatrices: array<mat4x4f>;
`;
export class ShaderGroup extends SceneCollection {
    geometry;
    code;
    module;
    pipeline;
    bindGroupLayout;
    topology;
    paramGenerator;
    vertexParams;
    bindGroup;
    valueBuffers;
    constructor(shaderCode, topology = 'triangle-list', vertexParams, paramGenerator, bindGroup) {
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
    propagateDevice(device) {
        super.propagateDevice(device);
        this.module = device.createShaderModule({ code: this.code });
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        const bindGroupLayout = device.createBindGroupLayout(baseBindGroupLayout);
        const bindGroups = [bindGroupLayout];
        if (this.bindGroup !== null) {
            const entryValues = this.bindGroup.bindings.map((binding, index) => ({
                binding: index,
                visibility: binding.visibility,
                buffer: binding.buffer
            }));
            this.bindGroupLayout = device.createBindGroupLayout({
                entries: entryValues
            });
            bindGroups.push(this.bindGroupLayout);
        }
        this.pipeline = createPipeline(device, this.module, bindGroups, presentationFormat, this.topology, this.vertexParams);
    }
    getBindGroupLayout() {
        return this.bindGroupLayout;
    }
    getPipeline() {
        return this.pipeline;
    }
    getBindGroupBuffers() {
        if (this.bindGroup === null)
            return null;
        if (this.device === null)
            return null;
        const values = this.bindGroup.values();
        if (this.valueBuffers === null) {
            this.valueBuffers = [];
            for (let i = 0; i < values.length; i++) {
                const buffer = this.createBuffer(this.device, values[i]);
                this.valueBuffers.push(buffer);
            }
        }
        else {
            for (let i = 0; i < values.length; i++) {
                const arrayConstructor = values[i].array;
                const array = new arrayConstructor(values[i].value);
                if (array.byteLength > this.valueBuffers[i].size) {
                    const newBuffer = this.createBuffer(this.device, values[i]);
                    this.valueBuffers[i].destroy();
                    this.valueBuffers[i] = newBuffer;
                }
                else {
                    this.device.queue.writeBuffer(this.valueBuffers[i], 0, array.buffer, array.byteOffset, array.byteLength);
                }
            }
        }
        return this.valueBuffers;
    }
    createBuffer(device, value) {
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
    updateMatrix(camera) {
        this.defaultUpdateMatrix(camera);
    }
    getVertexParamGenerator() {
        return this.paramGenerator;
    }
    hasBindGroup() {
        return !!this.bindGroup;
    }
}
export class Group extends SceneCollection {
    constructor(name) {
        super(name);
    }
    move(amount, t, f) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.loopElements((el) => el.move(amount, t, f));
    }
    moveTo(pos, t, f) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.loopElements((el) => el.moveTo(pos, t, f));
    }
    rotate(amount, t, f) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.loopElements((el) => el.rotate(amount, t, f));
    }
    rotateTo(rotation, t, f) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.loopElements((el) => el.rotateTo(rotation, t, f));
    }
    fill(newColor, t, f) {
        return this.loopElements((el) => el.fill(newColor, t, f));
    }
    loopElements(cb) {
        const scene = this.getScene();
        const promises = Array(scene.length);
        for (let i = 0; i < scene.length; i++) {
            promises[i] = cb(scene[i].getObj());
        }
        return wrapVoidPromise(Promise.all(promises));
    }
}
