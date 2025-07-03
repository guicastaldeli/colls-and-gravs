export class OutlineConfig {
    device;
    outlinePipeline;
    outlineBindGroup;
    outlineUniformBuffer;
    outlineDepthTexture;
    shaderLoader;
    constructor(device, shaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
    }
    async initOutline(canvas, device, format) {
        const [vertexShader, fragShader] = await Promise.all([
            this.shaderLoader.loader('./env/random-blocks/shaders/vertex.wgsl'),
            this.shaderLoader.loader('./env/random-blocks/shaders/frag.wgsl'),
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
                                offset: 5 * 4,
                                format: 'float32x3'
                            }]
                    }
                ]
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
                        }
                    }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: 'less-equal',
                format: 'depth24plus',
            }
        });
        this.outlineUniformBuffer = device.createBuffer({
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });
        const identityMatrix = new Float32Array(16);
        identityMatrix[0] = identityMatrix[5] = identityMatrix[10] = identityMatrix[15] = 1;
        device.queue.writeBuffer(this.outlineUniformBuffer, 0, identityMatrix);
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
