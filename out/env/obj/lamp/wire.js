import { vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    pipeline;
    uniformBuffer;
    vertexBuffer;
    windManager;
    segments;
    segmentLength;
    constructor(windManager, attachmentPoint, segmentCount, totalLength) {
        this.windManager = windManager;
        this.segments = [];
        this.segmentLength = totalLength / segmentCount;
        for (let i = 0; i < segmentCount; i++) {
            const y = attachmentPoint[1] - i * this.segmentLength;
            this.segments.push(vec3.fromValues(attachmentPoint[0], y, attachmentPoint[2]));
        }
    }
    async createPipeline(device, shaderLoader) {
        try {
            const { vertexShader, fragShader } = await this.initShaders(shaderLoader);
            const bindGroupLayout = device.createBindGroupLayout({
                entries: [{
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    }]
            });
            const pipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [bindGroupLayout]
                }),
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [{
                            arrayStride: 3 * 4,
                            attributes: [{
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                }]
                        }]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
                },
                primitive: {
                    topology: 'line-strip'
                },
                depthStencil: {
                    depthWriteEnabled: false,
                    depthCompare: 'always',
                    format: 'depth24plus'
                }
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    updateVertexBuffer(device) {
        const vertices = new Float32Array(this.segments.flat());
        if (!this.vertexBuffer || this.vertexBuffer.size !== vertices.byteLength) {
            this.vertexBuffer?.destroy();
            this.vertexBuffer = device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
        }
        new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
        this.vertexBuffer.unmap();
    }
    draw(device, passEncoder, viewProjectionMatrix) {
        if (!this.pipeline || !this.vertexBuffer || !this.uniformBuffer)
            return;
        device.queue.writeBuffer(this.uniformBuffer, 0, viewProjectionMatrix);
        const bindGroup = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [{
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                }]
        });
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.draw(this.segments.length);
    }
    getSegments() {
        return this.segments;
    }
    async initShaders(shaderLoader) {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl')
            ]);
            return {
                vertexShader,
                fragShader
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    update(device, deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
        for (let i = 1; i < this.segments.length; i++) {
            vec3.add(this.segments[i], this.segments[i], force);
            this.segments[i][1] -= 0.01;
            const prevSegment = this.segments[i - 1];
            const dir = vec3.create();
            vec3.subtract(dir, this.segments[i], prevSegment);
            const dist = vec3.length(dir);
            if (dist > this.segmentLength) {
                vec3.normalize(dir, dir);
                vec3.scaleAndAdd(this.segments[i], prevSegment, dir, this.segmentLength);
            }
        }
        this.updateVertexBuffer(device);
    }
    async init(device, shaderLoader) {
        this.uniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        await this.createPipeline(device, shaderLoader);
        this.initShaders(shaderLoader);
    }
}
