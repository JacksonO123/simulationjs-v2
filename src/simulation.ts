import { vec3 } from 'wgpu-matrix';
import { SimulationElement3d } from './graphics.js';
import type { Vector2, Vector3, LerpFunc, BackendType } from './types.js';
import { Color, matrix4, transitionValues, vector2, vector3, webGLAvailable } from './utils.js';
import {
    updateProjectionMatrix,
    updateOrthoProjectionMatrix,
    updateWorldProjectionMatrix,
    CachedArray,
    addToScene,
    removeSceneObj,
    removeSceneId
} from './internalUtils.js';
import { Settings } from './settings.js';
import { globalInfo, logger } from './globals.js';
import { SimJsBackend } from './backends/backend.js';
import { WebGLBackend } from './backends/webgl.js';
import { WebGPUBackend } from './backends/webgpu.js';
import { SimJSShader } from './shaders/shader.js';

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

        const fps = Math.round(
            this.fpsBuffer.reduce((acc, curr) => acc + curr, 0) / this.fpsBuffer.length
        );
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

type SimulationOptions = {
    camera?: Camera | null;
    showFrameRate?: boolean;
    backend?: BackendType;
};

type OmitOptionals<T> = T;

const defaultSimulationOptions: OmitOptionals<SimulationOptions> = {
    camera: null,
    showFrameRate: false,
    backend: 'webgpu'
};

export class Simulation extends Settings {
    canvasRef: HTMLCanvasElement | null = null;
    private scene: SimulationElement3d[] = [];
    private fittingElement = false;
    private running = true;
    private initialized = false;
    private resizeEvents: ((width: number, height: number) => void)[];
    private frameRateView: FrameRateView;
    private transparentElements: CachedArray<SimulationElement3d>;
    private backend: SimJsBackend;
    private camera: Camera;

    constructor(idOrCanvasRef: string | HTMLCanvasElement, options: SimulationOptions = {}) {
        const {
            camera = defaultSimulationOptions.camera!,
            showFrameRate = defaultSimulationOptions.showFrameRate!,
            backend = defaultSimulationOptions.backend!
        } = options;

        super();

        if (typeof idOrCanvasRef === 'string') {
            const ref = document.getElementById(idOrCanvasRef) as HTMLCanvasElement | null;
            if (!ref) throw logger.error(`Cannot find canvas with id ${idOrCanvasRef}`);
            this.canvasRef = ref;
        } else if (idOrCanvasRef instanceof HTMLCanvasElement) {
            this.canvasRef = idOrCanvasRef;
        } else throw logger.error(`Canvas ref/id provided is invalid`);

        if (camera) {
            this.camera = camera;
        } else {
            this.camera = new Camera(vector3());
        }

        const parent = this.canvasRef.parentElement;
        if (parent === null) throw logger.error('Canvas parent is null');

        this.resizeEvents = [];
        addEventListener('resize', () => {
            this.handleCanvasResize(parent);
        });

        this.frameRateView = new FrameRateView(showFrameRate);
        this.frameRateView.updateFrameRate(1);

        this.transparentElements = new CachedArray();

        if (backend === 'webgpu' && 'gpu' in navigator) {
            this.backend = new WebGPUBackend(this);
        } else if (webGLAvailable(this.canvasRef)) {
            this.backend = new WebGLBackend(this);
        } else {
            throw logger.error('WebGL and WebGPU not available');
        }
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

    getBackend() {
        return this.backend;
    }

    getWidth() {
        return this.canvasRef?.width || 0;
    }

    getHeight() {
        return this.canvasRef?.height || 0;
    }

    add(el: SimulationElement3d, id?: string) {
        addToScene(this, el, id);
    }

    remove(el: SimulationElement3d) {
        removeSceneObj(this.scene, el);
    }

    removeId(id: string) {
        removeSceneId(this.scene, id);
    }

    empty() {
        for (let i = 0; i < this.scene.length; i++) {
            this.scene[i].empty();
        }

        this.scene = [];
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

    preInitShader(shader: SimJSShader) {
        const backendType = this.backend.getBackendType();
        if (!shader.compatableWith(backendType)) {
            logger.warn('Not initializing shader, not compatible with backend');
            return;
        }

        this.backend.initShader(shader);
    }

    getCamera() {
        return this.camera;
    }

    start() {
        if (this.initialized) {
            this.running = true;
            return;
        }

        (async () => {
            if (this.canvasRef === null) return;

            const screenSize = vector2(this.canvasRef.width, this.canvasRef.height);
            this.camera.setScreenSize(screenSize);

            const canvas = this.canvasRef;
            canvas.width = canvas.clientWidth * devicePixelRatio;
            canvas.height = canvas.clientHeight * devicePixelRatio;

            this.initialized = true;
            this.running = true;

            await this.backend.init(this.canvasRef);

            this.render(canvas, this.backend);
        })();
    }

    stop() {
        this.running = false;
    }

    setBackground(color: Color) {
        this.backend.setClearColor(color);
    }

    setDefaultColor(color: Color) {
        globalInfo.setDefaultColor(color);
    }

    getDefaultColor() {
        return globalInfo.getDefaultColor();
    }

    getScene() {
        return this.scene;
    }

    private render(canvas: HTMLCanvasElement, backend: SimJsBackend) {
        const newAspectRatio = canvas.width / canvas.height;
        if (newAspectRatio !== aspectRatio) {
            updateProjectionMatrix(projMat, newAspectRatio);
            aspectRatio = newAspectRatio;
        }

        updateWorldProjectionMatrix(this.camera, worldProjectionMatrix, projMat);
        updateOrthoProjectionMatrix(orthogonalMatrix, this.camera.getScreenSize());

        backend.renderStart(canvas);

        // sub 10 to start with a reasonable gap between starting time and next frame time
        let prev = Date.now() - 10;
        let prevFps = 0;

        const frame = async () => {
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

            const screenSize = this.camera.getScreenSize();

            if (screenSize[0] !== canvas.width || screenSize[1] !== canvas.height) {
                this.camera.setScreenSize(vector2(canvas.width, canvas.height));
                screenSize[0] = canvas.width;
                screenSize[1] = canvas.height;

                aspectRatio = this.camera.getAspectRatio();
                updateProjectionMatrix(projMat, aspectRatio);
                updateWorldProjectionMatrix(this.camera, worldProjectionMatrix, projMat);

                backend.updateTextures(screenSize);
            }

            if (this.camera.hasUpdated()) {
                updateOrthoProjectionMatrix(orthogonalMatrix, this.camera.getScreenSize());
                updateWorldProjectionMatrix(this.camera, worldProjectionMatrix, projMat);
            }

            backend.preRender(this.scene);

            this.transparentElements.reset();

            const [opaqueVertexOffset, opaqueIndexOffset] = this.renderScene(
                backend,
                0,
                0,
                this.scene,
                this.scene.length,
                diff,
                false
            );

            this.renderScene(
                backend,
                opaqueVertexOffset,
                opaqueIndexOffset,
                this.transparentElements.getArray(),
                this.transparentElements.length,
                diff,
                true
            );

            this.camera.updateConsumed();

            backend.finishRender();
        };

        requestAnimationFrame(frame);
    }

    private renderScene(
        backend: SimJsBackend,
        startVertexCallOffset: number,
        startIndexOffset: number,
        scene: SimulationElement3d[],
        numElements: number,
        diff: number,
        transparent: boolean
    ) {
        let vertexCallOffset = startVertexCallOffset;
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
                    backend,
                    vertexCallOffset,
                    indexOffset,
                    childObjects,
                    childObjects.length,
                    diff,
                    transparent
                );
                vertexCallOffset += vertexDiff;
                indexOffset += indexDiff;
            }

            if (obj.isEmpty) continue;

            const vertexCallBuffer = obj.getVertexCallBuffer();
            const indices = obj.getIndexBuffer();

            backend.draw(
                obj,
                // vertex
                vertexCallOffset,
                vertexCallBuffer,
                // index
                indexOffset,
                indices
            );

            vertexCallOffset += vertexCallBuffer.byteLength;
            indexOffset += indices.byteLength;
        }

        return [vertexCallOffset - startVertexCallOffset, indexOffset - startIndexOffset] as const;
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
