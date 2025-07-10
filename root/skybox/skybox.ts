import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";
import { Stars } from "./stars.js";

export class Skybox {
    private device: GPUDevice;
    private vertexBuffer!: GPUBuffer;
    private indexBuffer!: GPUBuffer;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;
    private pipeline!: GPURenderPipeline;
    private shaderLoader: ShaderLoader;

    //Stars
    private stars: Stars;

    constructor(device: GPUDevice, shaderLoader: ShaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
        this.stars = new Stars(this.device, this.shaderLoader);
    }

    private async createSkyBox(): Promise<void> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./skybox/shaders/skybox/vertex.wgsl'),
                this.shaderLoader.loader('./skybox/shaders/skybox/frag.wgsl')
            ]);

            const size = 110;
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
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
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
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back',
                    frontFace: 'ccw'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public render(
        passEncoder: GPURenderPassEncoder,
        viewProjectionMatrix: mat4,
        time: number
    ) {
        //Skybox
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');

        this.device.queue.writeBuffer(this.uniformBuffer, 0, viewProjectionMatrix as Float32Array);
        passEncoder.drawIndexed(36);

        //Stars
        passEncoder.setPipeline(this.stars.pipeline);
        passEncoder.setBindGroup(0, this.stars.bindGroup);
        passEncoder.setVertexBuffer(0, this.stars.vertexBuffer);
        passEncoder.setVertexBuffer(1, this.stars.colorBuffer);
        passEncoder.setVertexBuffer(2, this.stars.scaleBuffer);
        passEncoder.setVertexBuffer(3, this.stars.phaseBuffer);

        const uniformData = new Float32Array(16 + 1);
        uniformData.set(viewProjectionMatrix as Float32Array, 0);
        uniformData[16] = time;
        this.device.queue.writeBuffer(this.stars.uniformBuffer, 0, uniformData);
        passEncoder.draw(this.stars.numStars);
    }

    public async init(): Promise<void> {
        await this.createSkyBox();
        await this.stars.createStars();
    }
}