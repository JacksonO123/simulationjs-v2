import { mat4, vec3 } from 'wgpu-matrix';
import { vector3 } from './graphics.js';
import { Vector3 } from './types.js';

export const buildProjectionMatrix = (aspectRatio: number, zNear = 1, zFar = 500) => {
  const fov = (2 * Math.PI) / 5;

  return mat4.perspective(fov, aspectRatio, zNear, zFar);
};

export const getTransformationMatrix = (pos: Vector3, rotation: Vector3, projectionMatrix: mat4) => {
  const modelViewProjectionMatrix = mat4.create();

  const viewMatrix = mat4.identity();

  const camPos = vector3();

  vec3.clone(pos, camPos);
  vec3.scale(camPos, -1, camPos);

  mat4.rotateZ(viewMatrix, rotation[2], viewMatrix);
  mat4.rotateY(viewMatrix, rotation[1], viewMatrix);
  mat4.rotateX(viewMatrix, rotation[0], viewMatrix);

  mat4.translate(viewMatrix, camPos, viewMatrix);

  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

  return modelViewProjectionMatrix as Float32Array;
};

export const getOrthoMatrix = (screenSize: [number, number]) => {
  return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100) as Float32Array;
};

export const buildDepthTexture = (device: GPUDevice, width: number, height: number) => {
  return device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });
};
