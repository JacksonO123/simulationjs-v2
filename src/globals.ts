import { createPipeline, logger } from './internalUtils.js';
import { Shader } from './shaders.js';

export class GlobalInfo {
  private device: GPUDevice | null;

  constructor() {
    this.device = null;
  }

  setDevice(device: GPUDevice) {
    this.device = device;
  }

  errorGetDevice() {
    if (!this.device) throw logger.error('GPUDevice is null');
    return this.device;
  }

  getDevice() {
    return this.device;
  }
}

export const globalInfo = new GlobalInfo();

export class PipelineCache {
  private pipelines: Map<string, GPURenderPipeline>;

  constructor() {
    this.pipelines = new Map();
  }

  getPipeline(device: GPUDevice, info: string, shader: Shader) {
    const res = this.pipelines.get(info);
    if (!res) return createPipeline(device, info, shader);
    return res;
  }
}

export const pipelineCache = new PipelineCache();
