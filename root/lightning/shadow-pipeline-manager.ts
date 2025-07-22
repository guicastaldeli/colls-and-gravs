import { ShaderLoader } from "../shader-loader.js";

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule;
}

export class ShadowPipelineManager {
    private _shadowPipeline!: GPURenderPipeline;
    private shaderLoader: ShaderLoader;

    private _bindGroupLayout!: GPUBindGroupLayout;
    private _textureBindGroupLayout!: GPUBindGroupLayout;

    constructor(shaderLoader: ShaderLoader) {
        this.shaderLoader = shaderLoader;
    }

    private async initShaders(device: GPUDevice): Promise<Shaders> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl')
            ]);

            return {
                vertexShader,
                fragShader
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async setBindGroups(device: GPUDevice): Promise<void> {
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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async init(
        device: GPUDevice,
        shadowBindGroupLayout: GPUBindGroupLayout,
        textureBindGroupLayout: GPUBindGroupLayout
    ): Promise<void> {
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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    get shadowPipeline(): GPURenderPipeline {
        if(!this._shadowPipeline) throw new Error('Shadow pipeline err');
        return this._shadowPipeline;
    }
}