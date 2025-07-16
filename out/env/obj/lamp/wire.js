import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    buffers;
    windManager;
    loader;
    bindGroup;
    pipeline = null;
    shaders;
    uniformBuffer;
    segments = [];
    segmentLength = 1.0;
    segmentCount = 10;
    totalLength = this.segmentLength * this.segmentCount;
    pos = {
        x: 7,
        y: 0,
        z: 0
    };
    size = {
        w: 5.0,
        h: 5.0,
        d: 5.0
    };
    constructor(windManager, loader) {
        this.windManager = windManager;
        this.loader = loader;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/wire.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);
            const wire = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return wire;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async createWire(baseBuffer, i) {
        try {
            const segmentBuffer = { ...baseBuffer, modelMatrix: mat4.create() };
            const position = vec3.fromValues(this.pos.x, this.pos.y + (i * this.segmentLength), this.pos.z);
            mat4.translate(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, position);
            mat4.scale(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, [
                this.size.w,
                this.size.h,
                this.size.d
            ]);
            return segmentBuffer;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
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
    async initPipeline(device) {
        try {
            const pipeline = device.createRenderPipeline({
                layout: 'auto',
                vertex: {
                    module: this.shaders.vertexShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 3 * 4,
                            attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }]
                        },
                        {
                            arrayStride: 3 * 4,
                            attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }]
                        }
                    ]
                },
                fragment: {
                    module: this.shaders.fragShader,
                    entryPoint: 'main',
                    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
                },
                primitive: {
                    topology: 'triangle-list'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                }
            });
            this.pipeline = pipeline;
            return pipeline;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async getBuffers() {
        return this.segments;
    }
    async render(device, passEncoder, viewProjectionMatrix) {
        if (!this.pipeline)
            throw new Error('err');
        passEncoder.setPipeline(this.pipeline);
        for (let i = 0; i < this.segments.length; i++) {
            this.uniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const segment = this.segments[i];
            const mvpMatrix = mat4.create();
            mat4.multiply(mvpMatrix, viewProjectionMatrix, segment.modelMatrix);
            device.queue.writeBuffer(this.uniformBuffer, 0, mvpMatrix);
            this.bindGroup = device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [{
                        binding: 0,
                        resource: {
                            buffer: this.uniformBuffer
                        }
                    }]
            });
            passEncoder.setVertexBuffer(0, segment.vertex);
            passEncoder.setVertexBuffer(1, segment.color);
            passEncoder.setIndexBuffer(segment.index, 'uint16');
            passEncoder.setBindGroup(0, this.bindGroup);
            passEncoder.drawIndexed(segment.indexCount);
        }
    }
    async update(device, deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
    }
    async init(device, passEncoder, shaderLoader, viewProjectionMatrix) {
        const buffers = await this.loadAssets();
        this.shaders = await this.initShaders(shaderLoader);
        await this.initPipeline(device);
        for (let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i);
            this.segments.push(segment);
        }
        if (this.segments.length > 0) {
            this.render(device, passEncoder, viewProjectionMatrix);
        }
    }
}
