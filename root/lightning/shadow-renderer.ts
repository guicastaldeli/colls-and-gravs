import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";
import { getBindGroups } from "../render.js";

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule;
}

export class ShadowRenderer {
    private isInit = false;
    private shaderLoader: ShaderLoader;
    private _pipeline!: GPURenderPipeline;
    private _bindGroup!: GPUBindGroup;
    private _shadowMapTexture!: GPUTexture;
    private uniformBuffers!: GPUBuffer[];

    constructor(shaderLoader: ShaderLoader) {
        this.shaderLoader = shaderLoader;
    }

    private async initShaders(): Promise<Shaders> {
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

    public async init(device: GPUDevice): Promise<void> {
        if(this.isInit) return;

        try {
            const { shadowBindGroupLayout } = await getBindGroups();
            const { vertexShader, fragShader } = await this.initShaders();
            
            this._shadowMapTexture = device.createTexture({
                size: [100, 100],
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
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
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
                    depthCompare: 'less',
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
            ]

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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private groundLevel(): number {
        return 0.0;
    }
    
    public updateUniforms(
        device: GPUDevice, 
        lightViewProjection: mat4,
    ) {
        device.queue.writeBuffer(
            this.uniformBuffers[0],
            0,
            lightViewProjection as Float32Array
        );
        device.queue.writeBuffer(
            this.uniformBuffers[1],
            0,
            new Float32Array([this.groundLevel()])
        );
    }

    get pipeline(): GPURenderPipeline {
        return this._pipeline;
    }

    get bindGroup(): GPUBindGroup {
        return this._bindGroup;
    }

    get shadowMapTexture(): GPUTexture {
        return this._shadowMapTexture;
    }
}