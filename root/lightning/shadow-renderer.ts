import { vec3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";
import { getBindGroups } from "../render.js";

interface Pipelines {
    shapePipeline: GPURenderPipeline,
    depthPipeline: GPURenderPipeline
}

interface Buffers {
    vpUniformBuffer: GPUBuffer;
    modelUniformBuffer: GPUBuffer;
    normalUniformBuffer: GPUBuffer;
    colorUniformBuffer: GPUBuffer;
    lightProjectionUniformBuffer: GPUBuffer;
    materialUniformBuffer: GPUBuffer;
}

interface BindGroups {
    vertex: GPUBindGroup;
    frag: GPUBindGroup;
    shadow: GPUBindGroup;
}

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule;
    depthShader: GPUShaderModule;
}

export class ShadowRenderer {
    private isInit = false;
    private shaderLoader: ShaderLoader;
    private depthTexture: GPUTexture | null = null;

    constructor(shaderLoader: ShaderLoader) {
        this.shaderLoader = shaderLoader;
    }

    private async setBuffers(device: GPUDevice): Promise<Buffers> {
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
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async setBindGroups(
        device: GPUDevice,
        shapePipeline: GPURenderPipeline,
        depthPipeline: GPURenderPipeline,
        data: any
    ): Promise<BindGroups> {
        try {
            const sampler = device.createSampler({ compare: 'less' });
            const depthTextureView = this.depthTexture?.createView();
            
            const vertexLayout = shapePipeline.getBindGroupLayout(0);
            const fragLayout = shapePipeline.getBindGroupLayout(1);
            const shadowLayout = depthPipeline.getBindGroupLayout(0);

            const {
                vpUniformBuffer,
                modelUniformBuffer,
                normalUniformBuffer,
                colorUniformBuffer,
                lightProjectionUniformBuffer,
                materialUniformBuffer
            } = await this.setBuffers(device);

            const vertexBindGroup = device.createBindGroup({
                layout: vertexLayout,
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
                layout: fragLayout,
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
                        resource: depthTextureView!
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
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async createPipelines(
        canvas: HTMLCanvasElement,
        device: GPUDevice
    ): Promise<Pipelines> {
        try {
            //Tex
            this.depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });

            const { vertexShader, fragShader, depthShader } = await this.loadShaders();
            const { shadowMapBindGroupLayout, depthBindGroupLayout } = await getBindGroups();
            const shapePipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [shadowMapBindGroupLayout, depthBindGroupLayout]
            });
            const depthPipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [shadowMapBindGroupLayout]
            });

            //Shape
            const shapePipeline = device.createRenderPipeline({
                layout: shapePipelineLayout,
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
                layout: depthPipelineLayout,
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
                },
                fragment: undefined,
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

            return { shapePipeline, depthPipeline }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async loadShaders(): Promise<Shaders> {
        try {
            const [
                vertexSrc, 
                fragSrc, 
                depthSrc
            ] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-depth.wgsl')
            ]);

            return {
                vertexShader: vertexSrc,
                fragShader: fragSrc,
                depthShader: depthSrc
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async draw(
        commandEncoder: GPUCommandEncoder,
        pipelines: GPURenderPipeline,
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        textureView: GPUTextureView,
        objects: any[]
    ): Promise<void> {
        for(const shadowData of objects) {
            const pipeline = this.createPipelines(canvas, device);
            const shapePipeline = (await pipeline).shapePipeline;
            const depthPipeline = (await pipeline).depthPipeline;
    
            const bindGroups = this.setBindGroups(device, shapePipeline, depthPipeline, shadowData);
            const shadowBindGroup = (await bindGroups).shadow;
    
            const passDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [{
                    view: textureView,
                    clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store'
                }],
                depthStencilAttachment: {
                    view: this.depthTexture!.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                }
            }
    
            const shadowPass = commandEncoder.beginRenderPass(passDescriptor);
            shadowPass.setPipeline(depthPipeline);
            shadowPass.setBindGroup(0, shadowBindGroup);
            shadowPass.end();
        }
    }
}