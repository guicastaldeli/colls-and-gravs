import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { getBindGroups } from "../render.js";
export class ShadowRenderer {
    isInit = false;
    shaderLoader;
    pipelines = null;
    buffers = null;
    bindGroups = null;
    depthTexture = null;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async setBuffers(device) {
        try {
            //Buffers
            const vpBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const modelBuffer = device.createBuffer({
                size: 64 * 100,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            const normalBuffer = device.createBuffer({
                size: 64 * 100,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            const colorBuffer = device.createBuffer({
                size: 64 * 100,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            const lightProjectionBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const materialBuffer = device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            return {
                vpBuffer,
                modelBuffer,
                normalBuffer,
                colorBuffer,
                lightProjectionBuffer,
                materialBuffer
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setBindGroups(device) {
        try {
            if (!this.pipelines || !this.buffers || !this.depthTexture)
                throw new Error('Initalize err');
            const sampler = device.createSampler({ compare: 'less' });
            const depthTextureView = this.depthTexture.createView();
            const { shapePipeline, depthPipeline } = this.pipelines;
            const vertexLayout = shapePipeline.getBindGroupLayout(0);
            const fragLayout = shapePipeline.getBindGroupLayout(1);
            const shadowLayout = depthPipeline.getBindGroupLayout(0);
            const { vpBuffer, modelBuffer, normalBuffer, colorBuffer, lightProjectionBuffer, materialBuffer } = this.buffers;
            const vertexBindGroup = device.createBindGroup({
                layout: vertexLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: vpBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: modelBuffer }
                    },
                    {
                        binding: 2,
                        resource: { buffer: normalBuffer }
                    },
                    {
                        binding: 3,
                        resource: { buffer: lightProjectionBuffer }
                    },
                    {
                        binding: 4,
                        resource: { buffer: colorBuffer }
                    }
                ]
            });
            const fragBindGroup = device.createBindGroup({
                layout: fragLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: lightProjectionBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: materialBuffer }
                    },
                    {
                        binding: 2,
                        resource: depthTextureView
                    },
                    {
                        binding: 3,
                        resource: sampler
                    }
                ]
            });
            const shadowBindGroup = device.createBindGroup({
                layout: shadowLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: lightProjectionBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: modelBuffer }
                    },
                    {
                        binding: 2,
                        resource: { buffer: normalBuffer }
                    },
                    {
                        binding: 3,
                        resource: { buffer: lightProjectionBuffer }
                    },
                    {
                        binding: 4,
                        resource: { buffer: colorBuffer }
                    }
                ]
            });
            return {
                vertex: vertexBindGroup,
                frag: fragBindGroup,
                shadow: shadowBindGroup
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async createPipelines(canvas, device) {
        try {
            this.depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            const { vertexShader, fragShader, depthShader } = await this.loadShaders();
            const { shadowMapBindGroupLayout, depthBindGroupLayout } = await getBindGroups();
            //Shape
            const shapePipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [shadowMapBindGroupLayout, depthBindGroupLayout]
                }),
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 5 * 4,
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                },
                                {
                                    shaderLocation: 1,
                                    offset: 3 * 4,
                                    format: 'float32x2'
                                },
                            ]
                        }
                    ]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none',
                    frontFace: 'ccw',
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less-equal',
                    format: 'depth24plus'
                }
            });
            //Depth
            const depthPipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [shadowMapBindGroupLayout]
                }),
                vertex: {
                    module: depthShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 5 * 4,
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                },
                                {
                                    shaderLocation: 1,
                                    offset: 3 * 4,
                                    format: 'float32x2'
                                },
                            ]
                        }
                    ]
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none',
                    frontFace: 'ccw'
                }
            });
            return { shapePipeline, depthPipeline };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async loadShaders() {
        try {
            const [vertexSrc, fragSrc, depthSrc] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-depth.wgsl')
            ]);
            return {
                vertexShader: vertexSrc,
                fragShader: fragSrc,
                depthShader: depthSrc
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async draw(commandEncoder, device, objects) {
        if (!this.isInit || !this.pipelines || !this.buffers || !this.depthTexture || !this.bindGroups) {
            throw new Error('Shadow Renderer not initalized!');
        }
        const validObjects = objects.filter(obj => obj &&
            obj.vertexBuffer &&
            obj.indexBuffer &&
            obj.indexCount > 0 &&
            obj.modelMatrix);
        if (validObjects.length === 0) {
            console.warn('No valid objects!');
            return;
        }
        const modelMatrices = validObjects.flatMap(obj => {
            if (!obj.modelMatrix) {
                console.warn('Object missing modelMatrix', obj);
                return Array(16).fill(0);
            }
            return Array.from(obj.modelMatrix);
        });
        const normalMatrices = validObjects.flatMap(obj => {
            if (!obj.normalMatrix) {
                const normal = mat4.create();
                mat4.invert(normal, obj.modelMatrix);
                mat4.transpose(normal, normal);
                return Array.from(normal);
            }
            return Array.from(obj.normalMatrix);
        });
        try {
            const modelArray = new Float32Array(modelMatrices);
            const normalArray = new Float32Array(normalMatrices);
            device.queue.writeBuffer(this.buffers.modelBuffer, 0, modelArray.buffer, modelArray.byteOffset, modelArray.byteLength);
            device.queue.writeBuffer(this.buffers.normalBuffer, 0, normalArray.buffer, normalArray.byteOffset, normalArray.byteLength);
            const shadowPass = commandEncoder.beginRenderPass({
                colorAttachments: [],
                depthStencilAttachment: {
                    view: this.depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store'
                }
            });
            shadowPass.setPipeline(this.pipelines.depthPipeline);
            shadowPass.setBindGroup(0, this.bindGroups.shadow);
            for (const obj of validObjects) {
                shadowPass.setVertexBuffer(0, obj.vertexBuffer);
                shadowPass.setIndexBuffer(obj.indexBuffer, 'uint16');
                shadowPass.drawIndexed(obj.indexCount);
            }
            shadowPass.end();
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async init(canvas, device) {
        if (this.isInit)
            return;
        this.pipelines = await this.createPipelines(canvas, device);
        this.buffers = await this.setBuffers(device);
        this.bindGroups = await this.setBindGroups(device);
        this.isInit = true;
    }
}
