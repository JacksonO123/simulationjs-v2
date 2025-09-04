import { worldProjMatOffset } from './constants.js';
import { globalInfo } from './globals.js';
import { orthogonalMatrix, worldProjectionMatrix } from './simulation.js';
export function createBindGroup(shader, bindGroupIndex, buffers) {
    const device = globalInfo.errorGetDevice();
    const layout = shader.getBindGroupLayouts()[bindGroupIndex];
    return device.createBindGroup({
        layout: layout,
        entries: buffers.map((buffer, index) => ({
            binding: index,
            resource: {
                buffer
            }
        }))
    });
}
export function writeUniformWorldMatrix(el) {
    const device = globalInfo.errorGetDevice();
    const uniformBuffer = el.getUniformBuffer();
    const projBuf = el.is3d ? worldProjectionMatrix : orthogonalMatrix;
    device.queue.writeBuffer(uniformBuffer, worldProjMatOffset, projBuf.buffer, projBuf.byteOffset, projBuf.byteLength);
}
