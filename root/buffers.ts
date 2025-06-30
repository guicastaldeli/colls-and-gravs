const vertices = new Float32Array([
    -0.5, -0.5,
    0.5, -0.5,
    -0.5, 0.5,

    -0.5, 0.5,
    0.5, -0.5,
    0.5, 0.5
]);

export async function initVertexBuffer(device: GPUDevice): Promise<GPUBuffer> {
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
    });

    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();
    return vertexBuffer;
}
