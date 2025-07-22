export class ShadowPipelineManager {
    _shadowPipeline;
    shaderLoader;
    _bindGroupLayout;
    _textureBindGroupLayout;
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
    async setBindGroups(device) {
        try {
            //Shadow Group
            this._bindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    },
                    {
                        binding: 3,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    },
                    {
                        binding: 4,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    }
                ]
            });
            //Texture Group
            this._textureBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {
                            sampleType: 'depth',
                            viewDimension: 'cube'
                        }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {
                            type: 'comparison'
                        }
                    }
                ]
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async init(device, shadowBindGroupLayout, textureBindGroupLayout) {
        try {
            const { vertexShader, fragShader } = await this.initShaders(device);
            await this.setBindGroups(device);
            this._bindGroupLayout = shadowBindGroupLayout;
            this._textureBindGroupLayout = textureBindGroupLayout;
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [
                    this._bindGroupLayout,
                    this._textureBindGroupLayout
                ]
            });
            this._shadowPipeline = device.createRenderPipeline({
                layout: pipelineLayout,
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
                    targets: []
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth32float'
                }
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    get shadowPipeline() {
        if (!this._shadowPipeline)
            throw new Error('Shadow pipeline err');
        return this._shadowPipeline;
    }
}
