import { vector3 } from './utils.js';

export const vertexSize = 40; // 4 * 10
export const positionOffset = 0;
export const colorOffset = 12; // 4 * 3
export const uvOffset = 28; // 4 * 8
export const drawingInstancesOffset = 36;
export const BUF_LEN = vertexSize / 4;
export const worldProjMatOffset = 0;
export const modelProjMatOffset = 4 * 16;

export const xAxis = vector3(1);
export const yAxis = vector3(0, 1);
export const zAxis = vector3(0, 0, 1);
