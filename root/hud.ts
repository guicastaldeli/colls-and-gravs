import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";

export class Hud {
    private device: GPUDevice;
    private pipeline!: GPURenderPipeline;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    private texture!: GPUTexture;
    private sampler!: GPUSampler;

    private transformBuffer!: GPUBuffer;
    private buffers!: {
        vertex: GPUBuffer,
        index: GPUBuffer,
        uv: GPUBuffer
    }

    constructor(
        device: GPUDevice, 
        pipeline: GPURenderPipeline,
        loader: Loader,
        shaderLoader: ShaderLoader
    ) {
        this.device = device;
        this.pipeline = pipeline;

        this.loader = loader;
        this.shaderLoader = shaderLoader;
    }

    private async drawCrosshair(w: number, h: number): Promise<void> {
        const aspectRatio = w / h;
        const baseHeight = 0.02;

        const height = baseHeight;
        const width = height * aspectRatio;
        const halfWidth = width / 4;
        const halfHeight = height / 2;

        const vertices = new Float32Array([
            -halfWidth, -halfHeight, 1,
            halfWidth, -halfHeight, 1,
            halfWidth,  halfHeight, 1,
            -halfWidth,  halfHeight, 1 
        ]);
        const uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1 
        ]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.buffers = {
            vertex: this.device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            }),
            uv: this.device.createBuffer({
                size: uvs.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            }),
            index: this.device.createBuffer({
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            })
        }

        new Float32Array(this.buffers.vertex.getMappedRange()).set(vertices);
        this.buffers.vertex.unmap();

        new Float32Array(this.buffers.uv.getMappedRange()).set(uvs);
        this.buffers.uv.unmap();

        new Uint16Array(this.buffers.index.getMappedRange()).set(indices);
        this.buffers.index.unmap();
    }

    private crosshairScale(w: number, h: number): void {
        const refWidth = 808;
        const refHeight = 460;
        
        const widthRatio = w / refWidth;
        const heightRatio = h / refHeight;
        const maxRatio = Math.max(widthRatio, heightRatio);

        const baseScale = 3.5;
        const minScale = 1.5;
        let dynamicScale = baseScale;

        if(maxRatio > 1.0) {
            dynamicScale = baseScale / maxRatio;
            dynamicScale = Math.max(minScale, dynamicScale);
        }

        const transform = mat4.create();
        mat4.scale(transform, transform, [dynamicScale, dynamicScale, 1]);
        if(this.transformBuffer) this.transformBuffer.destroy();

        this.transformBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.transformBuffer, 0, transform as Float32Array);
    }

    private async initShaders(): Promise<void> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./shaders/hud/vertex.wgsl'),
                this.shaderLoader.loader('./shaders/hud/frag.wgsl')
            ]);

            this.pipeline = this.device.createRenderPipeline({
                layout: 'auto',
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 3 * 4,
                            attributes: [{
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }]
                        },
                        {
                            arrayStride: 2 * 4,
                            attributes: [{
                                shaderLocation: 1,
                                offset: 0,
                                format: 'float32x2'
                            }]
                        }
                    ]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat(),
                    }]
                },
                primitive: {
                    topology: 'triangle-list'
                },
                depthStencil: {
                    depthWriteEnabled: false,
                    depthCompare: 'always',
                    format: 'depth24plus'
                }
            });
        } catch(err) {
            console.log(err)
            throw err;
        }
    }

    public async render(passEncoder: GPURenderPassEncoder): Promise<void> {
        try {
            if(!this.pipeline || !this.texture) return;
    
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: this.sampler
                    },
                    {
                        binding: 1,
                        resource: this.texture.createView()
                    }
                ]
            });

            const transformBindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(1),
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.transformBuffer
                    }
                }]
            });
    
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.setBindGroup(1, transformBindGroup);
            passEncoder.setVertexBuffer(0, this.buffers.vertex);
            passEncoder.setVertexBuffer(1, this.buffers.uv);
            passEncoder.setIndexBuffer(this.buffers.index, 'uint16');
            passEncoder.drawIndexed(6);
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public getCrosshairWorldPos(
        cameraPosition: vec3,
        cameraForward: vec3,
        distance: number
    ): vec3 {
        const worldPos = vec3.create();
        vec3.scaleAndAdd(worldPos, cameraPosition, cameraForward, distance);
        return worldPos;
    }

    private async getTexSize(tex: GPUTexture): Promise<{ w: number, h: number }> {
        return { w: 32, h: 32 }
    }

    public async update(w: number, h: number): Promise<void> {
        this.crosshairScale(w, h);
    }

    public async init(w: number, h: number): Promise<void> {
        try {
            this.texture = await this.loader.textureLoader('./assets/hud/crosshair.png');
            const texSize = await this.getTexSize(this.texture);

            await this.drawCrosshair(texSize.w, texSize.h);
            await this.initShaders();
            this.crosshairScale(w, h);

            this.sampler = this.device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear'
            });
        } catch(err) {
            console.log(err);
            throw err;
        }
    }
}