import { ShaderLoader } from "../shader-loader";

export class OutlineConfig {
    public outlinePipeline!: GPURenderPipeline;
    public outlineBindGroup!: GPUBindGroup;
    public outlineUniformBuffer!: GPUBuffer;
    public outlineDepthTexture!: GPUTexture;

    private shaderLoader: ShaderLoader;

    constructor(shaderLoader: ShaderLoader) {
        this.shaderLoader = shaderLoader;
    }

    public async initOutline(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        format: GPUTextureFormat
    ): Promise<void> {
        const [vertexShader, fragShader] = await Promise.all([
            this.shaderLoader.loader('./random-blocks/shaders/vertex.wgsl'),
            this.shaderLoader.loader('./random-blocks/shaders/frag.wgsl'),
        ]);

        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            }]
        });

        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        this.outlinePipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3'
                        }]
                    },
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                            shaderLocation: 1,
                            offset: 0,
                            format: 'float32x3'
                        }]
                    }
                ]
            },
            fragment: {
                module: fragShader,
                entryPoint: 'main',
                targets: [{
                    format: format,
                }]
            },
            primitive: {
                topology: 'line-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: 'always',
                format: 'depth24plus'
            }
        });

        this.outlineUniformBuffer = device.createBuffer({
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });

        this.outlineBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: this.outlineUniformBuffer }
            }]
        });

        this.outlineDepthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
}