import { getBindGroups } from "../render.js";
export class ShadowRenderer {
    isInit = false;
    shaderLoader;
    depthTexture = null;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async setBuffers(device) {
        try {
            //Buffers
            const vpUniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const modelUniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const normalUniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const colorUniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const lightProjectionUniformBuffer = device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const materialUniformBuffer = device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            return {
                vpUniformBuffer,
                modelUniformBuffer,
                normalUniformBuffer,
                colorUniformBuffer,
                lightProjectionUniformBuffer,
                materialUniformBuffer
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setBindGroups(device, shapePipeline, depthPipeline) {
        try {
            const depthTextureView = this.depthTexture?.createView();
            const sampler = device.createSampler({ compare: 'less' });
            const { vpUniformBuffer, modelUniformBuffer, normalUniformBuffer, colorUniformBuffer, lightProjectionUniformBuffer, materialUniformBuffer } = await this.setBuffers(device);
            const vertexBindGroup = device.createBindGroup({
                layout: shapePipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: vpUniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: modelUniformBuffer }
                    },
                    {
                        binding: 2,
                        resource: { buffer: normalUniformBuffer }
                    },
                    {
                        binding: 3,
                        resource: { buffer: lightProjectionUniformBuffer }
                    },
                    {
                        binding: 4,
                        resource: { buffer: colorUniformBuffer }
                    }
                ]
            });
            const fragBindGroup = device.createBindGroup({
                layout: shapePipeline.getBindGroupLayout(1),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: lightProjectionUniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: materialUniformBuffer }
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
                layout: depthPipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: modelUniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: lightProjectionUniformBuffer }
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
            const { vertexShader, fragShader, depthShader } = await this.loadShaders();
            const { shadowMapBindGroupLayout } = await getBindGroups();
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [shadowMapBindGroupLayout]
            });
            //Shape
            const shapePipeline = device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 8 * 4,
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
                    targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
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
                layout: pipelineLayout,
                vertex: {
                    module: depthShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 8 * 4,
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
                }
            });
            //Tex
            this.depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
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
    async draw(commandEncoder, pipelines, canvas, device, textureView, objects) {
        for (const shadowData of objects) {
            const pipeline = this.createPipelines(canvas, device);
            const shapePipeline = (await pipeline).shapePipeline;
            const depthPipeline = (await pipeline).depthPipeline;
            const bindGroups = this.setBindGroups(device, shapePipeline, depthPipeline);
            const shadowBindGroup = (await bindGroups).shadow;
            const passDescriptor = {
                colorAttachments: [{
                        view: textureView,
                        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                        loadOp: 'clear',
                        storeOp: 'store'
                    }],
                depthStencilAttachment: {
                    view: this.depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                }
            };
            const shadowPass = commandEncoder.beginRenderPass(passDescriptor);
            shadowPass.setPipeline(depthPipeline);
            shadowPass.setBindGroup(0, shadowBindGroup);
            shadowPass.end();
        }
    }
}
