import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
export class CollisionBoxHelper {
    device;
    shaderLoader;
    pipeline = null;
    vertexBuffer = null;
    indexBuffer = null;
    uniformBuffer = null;
    bindGroup = null;
    bindGroupLayout = null;
    pipelineLayout = null;
    destroyed = false;
    constructor(device, shaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
    }
    async init() {
        if (this.destroyed) {
            throw new Error("Cannot initialize destroyed CollisionBoxHelper");
        }
        try {
            await this.createBuffers();
            await this.createPipelineLayout();
            await this.createPipeline();
            await this.createBindGroup();
        }
        catch (error) {
            await this.cleanup();
            throw error;
        }
    }
    async createBuffers() {
        // Cube vertices (8 corners)
        const vertices = new Float32Array([
            // Front face
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, 0.5, 0.5,
            // Back face
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
            0.5, 0.5, -0.5,
            -0.5, 0.5, -0.5
        ]);
        // Indices for line list (12 edges of the cube)
        const indices = new Uint16Array([
            // Front face
            0, 1, 1, 2, 2, 3, 3, 0,
            // Back face
            4, 5, 5, 6, 6, 7, 7, 4,
            // Connecting edges
            0, 4, 1, 5, 2, 6, 3, 7
        ]);
        this.vertexBuffer = this.device.createBuffer({
            label: "CollisionBoxHelper Vertex Buffer",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
        this.indexBuffer = this.device.createBuffer({
            label: "CollisionBoxHelper Index Buffer",
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.indexBuffer, 0, indices);
        this.uniformBuffer = this.device.createBuffer({
            label: "CollisionBoxHelper Uniform Buffer",
            size: 16 * 4, // mat4
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    async createPipelineLayout() {
        this.bindGroupLayout = this.device.createBindGroupLayout({
            label: "CollisionBoxHelper Bind Group Layout",
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                }]
        });
        this.pipelineLayout = this.device.createPipelineLayout({
            label: "CollisionBoxHelper Pipeline Layout",
            bindGroupLayouts: [this.bindGroupLayout]
        });
    }
    async createPipeline() {
        const [vertexShader, fragmentShader] = await Promise.all([
            this.shaderLoader.loader('./random-blocks/shaders/collision-box-vertex.wgsl'),
            this.shaderLoader.loader('./random-blocks/shaders/collision-box-frag.wgsl')
        ]);
        if (!this.pipelineLayout) {
            throw new Error("Pipeline layout not created");
        }
        this.pipeline = this.device.createRenderPipeline({
            label: "CollisionBoxHelper Pipeline",
            layout: this.pipelineLayout,
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [{
                        arrayStride: 3 * 4, // 3 floats (x,y,z)
                        attributes: [{
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }]
                    }]
            },
            fragment: {
                module: fragmentShader,
                entryPoint: 'main',
                targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
            },
            primitive: {
                topology: 'line-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less-equal',
                format: 'depth24plus'
            }
        });
    }
    async createBindGroup() {
        if (!this.uniformBuffer || !this.bindGroupLayout) {
            throw new Error("Required resources not initialized for bind group creation");
        }
        this.bindGroup = this.device.createBindGroup({
            label: "CollisionBoxHelper Bind Group",
            layout: this.bindGroupLayout,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }]
        });
    }
    async destroy() {
        if (this.destroyed)
            return;
        await this.device.queue.onSubmittedWorkDone();
        if (this.vertexBuffer)
            this.vertexBuffer.destroy();
        if (this.indexBuffer)
            this.indexBuffer.destroy();
        if (this.uniformBuffer)
            this.uniformBuffer.destroy();
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.uniformBuffer = null;
        this.pipeline = null;
        this.bindGroup = null;
        this.bindGroupLayout = null;
        this.pipelineLayout = null;
        this.destroyed = true;
    }
    async cleanup() {
        try {
            await this.destroy();
        }
        catch (error) {
            console.error("Error during CollisionBoxHelper cleanup:", error);
        }
    }
    render(passEncoder, viewProjectionMatrix, position, size, color = [1, 0, 0]) {
        if (this.destroyed) {
            console.warn("Cannot render with destroyed CollisionBoxHelper");
            return;
        }
        if (!this.pipeline || !this.vertexBuffer || !this.indexBuffer ||
            !this.uniformBuffer || !this.bindGroup) {
            console.warn("CollisionBoxHelper not properly initialized");
            return;
        }
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, position);
        mat4.scale(modelMatrix, modelMatrix, size);
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjectionMatrix, modelMatrix);
        this.device.queue.writeBuffer(this.uniformBuffer, 0, mvp);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
        passEncoder.drawIndexed(24);
    }
}
