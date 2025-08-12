import { mat4 } from "../node_modules/gl-matrix/esm/index.js";

import { initEnvBuffers } from "./env/env-buffers.js";
import { EnvBufferData } from "./env/env-buffers.js";

export type BufferData = {
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    initEnvBuffers: EnvBufferData;
}

export async function initBuffers(device: GPUDevice): Promise<BufferData> {
    const vertexBuffer = await initVertexBuffer(device);
    const colorBuffer = await initColorBuffer(device);
    const { buffer: indexBuffer, count: indexCount } = await initIndexBuffer(device);

    //Env
    const initEnvBuffersData = await initEnvBuffers(device);

    return {
        vertex: vertexBuffer,
        color: colorBuffer,
        index: indexBuffer,
        indexCount: indexCount,
        initEnvBuffers: initEnvBuffersData
    }
}

export async function drawBuffers(
    device: GPUDevice,
    passEncoder: GPURenderPassEncoder,
    bindGroup: GPUBindGroup,
    buffers: BufferData,
    mainModelMatrix: mat4,
    envBuffers: EnvBufferData[],
    uniformBuffer: GPUBuffer,
    viewProjectionMatrix: mat4,
): Promise<void> {
    //Main
    const main = mat4.create();
    mat4.multiply(main, viewProjectionMatrix, mainModelMatrix);
    const mainBuffer = new Float32Array(64);
    mainBuffer.set(main);

    device.queue.writeBuffer(uniformBuffer, 0, mainBuffer);
    passEncoder.setVertexBuffer(0, buffers.vertex);
    passEncoder.setVertexBuffer(1, buffers.color);
    passEncoder.setBindGroup(0, bindGroup, [0]);
    passEncoder.setIndexBuffer(buffers.index, 'uint16');
    passEncoder.drawIndexed(buffers.indexCount);

    const maxBlocks = Math.floor(uniformBuffer.size / 256) - 1;
    const blocksToRender = Math.min(envBuffers.length, maxBlocks);
    
    //Env
    for(let i = 0; i < blocksToRender; i++) {
        const env = mat4.create();
        const envBuffer = envBuffers[i];
        mat4.multiply(env, viewProjectionMatrix, envBuffer.modelMatrix);
        const offset = 256 * (i + 1);
    
        const mvpArray = new Float32Array(env);
        device.queue.writeBuffer(uniformBuffer, offset, mvpArray);

        passEncoder.setVertexBuffer(0, envBuffer.vertex);
        passEncoder.setVertexBuffer(1, envBuffer.color);
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.setIndexBuffer(envBuffer.index, 'uint16');
        passEncoder.drawIndexed(envBuffer.indexCount);
    }
}

async function initIndexBuffer(device: GPUDevice): Promise<{ buffer: GPUBuffer, count: number }> {
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
    return { buffer: indexBuffer, count: indices.length }
}

async function initVertexBuffer(device: GPUDevice): Promise<GPUBuffer> {
    const vertices = new Float32Array([
        -0.5, -0.5,  0.5,
        0.5, -0.5,  0.5,
        0.5,  0.5,  0.5,
        -0.5,  0.5,  0.5,
        
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5, -0.5, -0.5,
        
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
        0.5,  0.5,  0.5,
        0.5,  0.5, -0.5,
        
        -0.5, -0.5, -0.5,
        0.5, -0.5, -0.5,
        0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
        
        0.5, -0.5, -0.5,
        0.5,  0.5, -0.5,
        0.5,  0.5,  0.5,
        0.5, -0.5,  0.5,
        
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5,
        -0.5,  0.5,  0.5,
        -0.5,  0.5, -0.5,
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

async function initColorBuffer(device: GPUDevice): Promise<GPUBuffer> {
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
