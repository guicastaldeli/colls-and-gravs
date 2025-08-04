import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { Stars } from "./stars.js";
export class Skybox {
    tick;
    device;
    vertexBuffer;
    indexBuffer;
    uniformBuffer;
    bindGroup;
    pipeline;
    shaderLoader;
    //Stars
    stars;
    constructor(tick, device, shaderLoader) {
        this.tick = tick;
        this.device = device;
        this.shaderLoader = shaderLoader;
        this.stars = new Stars(this.device, this.shaderLoader);
    }
    async createSkyBox() {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./skybox/shaders/skybox/vertex.wgsl'),
                this.shaderLoader.loader('./skybox/shaders/skybox/frag.wgsl')
            ]);
            const size = 300;
            const vertices = new Float32Array([
                -size, -size, size, size, -size, size, size, size, size, -size, size, size,
                -size, -size, -size, -size, size, -size, size, size, -size, size, -size, -size,
                -size, size, -size, -size, size, size, size, size, size, size, size, -size,
                -size, -size, -size, size, -size, -size, size, -size, size, -size, -size, size,
                size, -size, -size, size, size, -size, size, size, size, size, -size, size,
                -size, -size, -size, -size, -size, size, -size, size, size, -size, size, -size
            ]);
            const indices = new Uint16Array([
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                8, 9, 10, 8, 10, 11,
                12, 13, 14, 12, 14, 15,
                16, 17, 18, 16, 18, 19,
                20, 21, 22, 20, 22, 23
            ]);
            this.vertexBuffer = this.device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
            this.indexBuffer = this.device.createBuffer({
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.indexBuffer, 0, indices);
            this.uniformBuffer = this.device.createBuffer({
                size: 16 * 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            this.pipeline = this.device.createRenderPipeline({
                layout: 'auto',
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
                            format: navigator.gpu.getPreferredCanvasFormat(),
                            blend: {
                                color: {
                                    srcFactor: 'src-alpha',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add'
                                },
                                alpha: {
                                    srcFactor: 'one',
                                    dstFactor: 'one-minus-src-alpha',
                                    operation: 'add'
                                }
                            },
                            writeMask: GPUColorWrite.ALL
                        }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none',
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less-equal',
                    format: 'depth24plus'
                }
            });
            this.bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [{
                        binding: 0,
                        resource: {
                            buffer: this.uniformBuffer
                        }
                    }]
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async render(passEncoder, viewProjectionMatrix, deltaTime) {
        this.stars.update(deltaTime);
        //Skybox
        this.device.queue.writeBuffer(this.uniformBuffer, 0, viewProjectionMatrix);
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
        passEncoder.drawIndexed(36);
        //Stars
        const time = deltaTime * 10;
        this.stars.rotationAngle += this.stars.rotationSpeed * time;
        const rotationMatrix = mat4.create();
        mat4.rotateY(rotationMatrix, rotationMatrix, this.stars.rotationAngle);
        const lastBufferIndex = this.stars.currentBufferIndex;
        this.stars.currentBufferIndex = (lastBufferIndex % 1) % this.stars.uniformBuffers.length;
        const currentBuffer = this.stars.uniformBuffers[this.stars.currentBufferIndex];
        const uniformData = new Float32Array(36);
        uniformData.set(viewProjectionMatrix, 0);
        uniformData.set(rotationMatrix, 16);
        uniformData[32] = this.stars.twinkleTime;
        this.device.queue.writeBuffer(currentBuffer, 0, uniformData);
        passEncoder.setPipeline(this.stars.pipeline);
        passEncoder.setBindGroup(0, this.stars.bindGroups[this.stars.currentBufferIndex]);
        passEncoder.setVertexBuffer(0, this.stars.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.stars.colorBuffer);
        passEncoder.setVertexBuffer(2, this.stars.scaleBuffer);
        passEncoder.setVertexBuffer(3, this.stars.phaseBuffer);
        passEncoder.setVertexBuffer(4, this.stars.uvBuffer);
        passEncoder.draw(this.stars.numStars);
    }
    async init() {
        await this.createSkyBox();
        await this.stars.createStars();
    }
}
