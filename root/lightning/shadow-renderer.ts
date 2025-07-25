import { ShaderLoader } from "../shader-loader.js";

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule;
}

export class ShadowPipelineManager {
    private _shadowPipeline!: GPURenderPipeline;
    private shaderLoader: ShaderLoader;

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

    public async init(
        device: GPUDevice,
        shadowBindGroupLayout: GPUBindGroupLayout,
        pointLightBindGroupLayout: GPUBindGroupLayout
    ): Promise<void> {
        try {
            const { vertexShader, fragShader } = await this.initShaders(device);

            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [
                    shadowBindGroupLayout,
                    pointLightBindGroupLayout
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
                    cullMode: 'front'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less-equal',
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