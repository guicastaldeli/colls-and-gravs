import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
export async function initBuffers(device) {
    const vertexBuffer = await initVertexBuffer(device);
    const colorBuffer = await initColorBuffer(device);
    const { buffer: indexBuffer, count: indexCount } = await initIndexBuffer(device);
    return {
        vertex: vertexBuffer,
        color: colorBuffer,
        index: indexBuffer,
        indexCount: indexCount,
    };
}
export async function drawBuffers(device, passEncoder, bindGroup, buffers, uniformBuffer, viewProjectionMatrix) {
    const buffer = mat4.create();
    mat4.multiply(buffer, viewProjectionMatrix, buffer);
    const blockBuffer = new Float32Array(64);
    blockBuffer.set(buffer);
    device.queue.writeBuffer(uniformBuffer, 0, blockBuffer);
    passEncoder.setVertexBuffer(0, buffers.vertex);
    passEncoder.setVertexBuffer(1, buffers.color);
    passEncoder.setBindGroup(0, bindGroup, [0]);
    passEncoder.setIndexBuffer(buffers.index, 'uint16');
    passEncoder.drawIndexed(buffers.indexCount);
}
async function initIndexBuffer(device) {
    const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3,
        4, 5, 6, 4, 6, 7,
        8, 9, 10, 8, 10, 11,
        12, 13, 14, 12, 14, 15,
        16, 17, 18, 16, 18, 19,
        20, 21, 22, 20, 22, 23
    ]);
    const indexBuffer = device.createBuffer({
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Uint16Array(indexBuffer.getMappedRange()).set(indices);
    indexBuffer.unmap();
    return { buffer: indexBuffer, count: indices.length };
}
async function initVertexBuffer(device) {
    const vertices = new Float32Array([
        -0.5, -0.5, 0.5,
        0.5, -0.5, 0.5,
        0.5, 0.5, 0.5,
        -0.5, 0.5, 0.5,
        -0.5, -0.5, -0.5,
        -0.5, 0.5, -0.5,
        0.5, 0.5, -0.5,
        0.5, -0.5, -0.5,
        -0.5, 0.5, -0.5,
        -0.5, 0.5, 0.5,
        0.5, 0.5, 0.5,
        0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5, 0.5,
        -0.5, -0.5, 0.5,
        0.5, -0.5, -0.5,
        0.5, 0.5, -0.5,
        0.5, 0.5, 0.5,
        0.5, -0.5, 0.5,
        -0.5, -0.5, -0.5,
        -0.5, -0.5, 0.5,
        -0.5, 0.5, 0.5,
        -0.5, 0.5, -0.5,
    ]);
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();
    return vertexBuffer;
}
async function initColorBuffer(device) {
    const colors = new Float32Array([
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        0.0, 0.0, 1.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        1.0, 0.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0,
        0.0, 1.0, 1.0
    ]);
    const colorBuffer = device.createBuffer({
        size: colors.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });
    new Float32Array(colorBuffer.getMappedRange()).set(colors);
    colorBuffer.unmap();
    return colorBuffer;
}
