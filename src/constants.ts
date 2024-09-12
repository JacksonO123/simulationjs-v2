import { vector3 } from './utils.js';

export const vertexSize = 40; // 4 * 10
export const worldProjMatOffset = 0;
export const modelProjMatOffset = 4 * 16;
export const mat4ByteLength = 64;

export const xAxis = vector3(1);
export const yAxis = vector3(0, 1);
export const zAxis = vector3(0, 0, 1);
export const origin0 = vector3();
