import { getBindGroups } from "../render.js";
export class ShadowRenderer {
    isInit = false;
    shaderLoader;
    _pipeline;
    _bindGroup;
    _shadowMapTexture;
    uniformBuffers;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async initShaders(device) {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl')
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
    async init(device) {
        if (this.isInit)
            return;
        try {
            const { shadowBindGroupLayout } = await getBindGroups();
            const { vertexShader, fragShader } = await this.initShaders(device);
            this._shadowMapTexture = device.createTexture({
                size: [1048, 1048],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            this._pipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [shadowBindGroupLayout]
                }),
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [{
                            arrayStride: 8 * 4,
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                },
                                {
                                    shaderLocation: 2,
                                    offset: 5 * 4,
                                    format: 'float32x3'
                                }
                            ]
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
                    cullMode: 'none'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less-equal',
                    format: 'depth24plus'
                }
            });
            this.uniformBuffers = [
                device.createBuffer({
                    size: 64,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }),
                device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            ];
            this._bindGroup = device.createBindGroup({
                layout: shadowBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.uniformBuffers[0] }
                    },
                    {
                        binding: 1,
                        resource: { buffer: this.uniformBuffers[1] }
                    }
                ]
            });
            this.isInit = true;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    groundLevel() {
        return 0.0;
    }
    updateUniforms(device, lightViewProjection) {
        device.queue.writeBuffer(this.uniformBuffers[0], 0, lightViewProjection);
        device.queue.writeBuffer(this.uniformBuffers[1], 0, new Float32Array([this.groundLevel()]));
    }
    get pipeline() {
        return this._pipeline;
    }
    get bindGroup() {
        return this._bindGroup;
    }
    get shadowMapTexture() {
        return this._shadowMapTexture;
    }
}
