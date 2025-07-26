import { vec3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";
import { getBindGroups } from "../render.js";

interface Shaders {
    renderVertexShader: string;
    renderFragShader: string;
    mapVertexShader: string;
    mapFragShader: string;
}

interface Map {
    renderVertexShader: GPUShaderModule;
    renderFragShader: GPUShaderModule;
    mapVertexShader: GPUShaderModule;
    mapFragShader: GPUShaderModule;
}

export class ShadowRenderer {
    private isInit = false;
    private shaderLoader: ShaderLoader;
    private uniformBuffers!: GPUBuffer[];
    private _shadowSampler!: GPUSampler;

    //Render
    private _shadowRenderPipeline!: GPURenderPipeline;
    private _shadowRenderBindGroup!: GPUBindGroup;
    
    //Map
    private _shadowMapPipeline!: GPURenderPipeline;
    private _shadowMapBindGroup!: GPUBindGroup;
    private _shadowMapTexture!: GPUTexture;
    private _shadowMapView!: GPUTextureView;
    private _shadowMapSize: number = 1024;
    
    private lightPosition: vec3 = vec3.fromValues(10, 15, 10);
    private lightTarget: vec3 = vec3.fromValues(0, 0, 0);
    private shadowBias: number = 0.005;
    private shadowRadius: number = 3.0;
    private lightIntensity: number = 1.0;

    constructor(shaderLoader: ShaderLoader) {
        this.shaderLoader = shaderLoader;
    }

    private async loadShaders(): Promise<Shaders> {
        try {
            const [
                vertexSrc, 
                fragSrc,
                mapVertexSrc,
                mapFragSrc
            ] = await Promise.all([
                this.shaderLoader.sourceLoader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.sourceLoader('./lightning/shaders/shadow-frag.wgsl'),
                this.shaderLoader.sourceLoader('./lightning/shaders/shadow-map-vertex.wgsl'),
                this.shaderLoader.sourceLoader('./lightning/shaders/shadow-map-frag.wgsl')
            ]);

            return {
                renderVertexShader: vertexSrc,
                renderFragShader: fragSrc,
                mapVertexShader: mapVertexSrc,
                mapFragShader: mapFragSrc
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async createMapShaders(device: GPUDevice): Promise<Map> {
        try {
            const {
                renderVertexShader,
                renderFragShader, 
                mapVertexShader, 
                mapFragShader 
            } = await this.loadShaders();

            const renderVertexCode = device.createShaderModule({ code: renderVertexShader });
            const renderFragCode = device.createShaderModule({ code: renderFragShader });
            const mapVertexCode = device.createShaderModule({ code: mapVertexShader });
            const mapFragCode = device.createShaderModule({ code: mapFragShader });
            
            return {
                renderVertexShader: renderVertexCode,
                renderFragShader: renderFragCode,
                mapVertexShader: mapVertexCode, 
                mapFragShader: mapFragCode
            }
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async init(device: GPUDevice): Promise<void> {
        if(this.isInit) return;

        try {
            const { shadowBindGroupLayout, shadowMapBindGroupLayout } = await getBindGroups();

            const {
                renderVertexShader,
                renderFragShader,
                mapVertexShader,
                mapFragShader
            } = await this.createMapShaders(device);

            const renderShaders = { 
                renderVertexShader: renderVertexShader, 
                renderFragShader: renderFragShader 
            }
            const mapShaders = { 
                mapVertexShader: mapVertexShader, 
                mapFragShader: mapFragShader 
            }
            
            this._shadowMapTexture = device.createTexture({
                size: [this._shadowMapSize, this._shadowMapSize],
                format: 'depth32float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            this._shadowMapView = this._shadowMapTexture.createView();

            this._shadowSampler = device.createSampler({
                magFilter: 'linear',
                minFilter: 'linear',
                compare: 'less'
            });

            //Render
                this._shadowRenderPipeline = device.createRenderPipeline({
                    layout: device.createPipelineLayout({
                        bindGroupLayouts: [shadowBindGroupLayout]
                    }),
                    vertex: {
                        module: renderShaders.renderVertexShader,
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
                        module: renderShaders.renderFragShader,
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
                        format: 'depth24plus'
                    }
                });

                this._shadowRenderBindGroup = device.createBindGroup({
                    layout: shadowBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: this._shadowSampler
                        },
                        {
                            binding: 1,
                            resource: this._shadowMapView
                        }
                    ]
                });
            //

            //Map
                this._shadowMapPipeline = device.createRenderPipeline({
                    layout: device.createPipelineLayout({
                        bindGroupLayouts: [shadowMapBindGroupLayout]
                    }),
                    vertex: {
                        module: mapShaders.mapVertexShader,
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
                        module: mapShaders.mapFragShader,
                        entryPoint: 'main',
                        targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
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

                
                this._shadowMapBindGroup = device.createBindGroup({
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
            //

            this.uniformBuffers = [
                device.createBuffer({
                    size: 64,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }),
                device.createBuffer({
                    size: 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }),
                device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }),
                device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            ];

            this.isInit = true;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public updateLightPosition(position: vec3): void {
        vec3.copy(this.lightPosition, position);
    }
    
    public updateUniforms(device: GPUDevice, objects: any[]) {
        const lightProjection = mat4.ortho(
            mat4.create(),
            -15, 15,
            -15, 15,
            0.1, 50
        );
        const lightView = mat4.lookAt(
            mat4.create(),
            this.lightPosition,
            this.lightTarget,
            [0, 1, 0]
        );
        const lightViewProjection = mat4.multiply(
            mat4.create(),
            lightProjection,
            lightView
        );

        device.queue.writeBuffer(this.uniformBuffers[0], 0, lightViewProjection as Float32Array);
        device.queue.writeBuffer(this.uniformBuffers[1], 0, new Float32Array([0.0]));
        device.queue.writeBuffer(this.uniformBuffers[2], 0, new Float32Array([
            this.lightPosition[0],
            this.lightPosition[1],
            this.lightPosition[2],
            0.0
        ]));
        device.queue.writeBuffer(this.uniformBuffers[3], 0, new Float32Array([
            this.shadowBias,
            this.shadowRadius,
            this.lightIntensity,
            25.0
        ]));
    }

    public async renderShadows(
        device: GPUDevice,
        commandEncoder: GPUCommandEncoder,
        objects: any[],
        mainPassEncoder: GPURenderPassEncoder
    ): Promise<void> {
        try {
            const { shadowBindGroupLayout } = await getBindGroups();
    
            const shadowCasters = objects.filter(obj =>
                obj.position && obj.position[1] > 0.1
            );
            if(shadowCasters.length === 0) return;
    
            this.updateUniforms(device, shadowCasters);
            mainPassEncoder.setPipeline(this._shadowRenderPipeline);
    
            const shadowBindGroup = device.createBindGroup({
                layout: shadowBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.uniformBuffers[0] }
                    },
                    {
                        binding: 1,
                        resource: { buffer: this.uniformBuffers[1] }
                    },
                    {
                        binding: 2,
                        resource: { buffer: this.uniformBuffers[2] }
                    },
                    {
                        binding: 3,
                        resource: { buffer: this.uniformBuffers[3] }
                    }
                ] 
            });

            mainPassEncoder.setBindGroup(0, shadowBindGroup);
            mainPassEncoder.setBindGroup(1, this._shadowRenderBindGroup);

            for(const obj of shadowCasters) {
                if(obj.vertex && obj.index) {
                    mainPassEncoder.setVertexBuffer(0, obj.vertex);
                    mainPassEncoder.setIndexBuffer(obj.index, 'uint16');
                    mainPassEncoder.drawIndexed(obj.indexCount);
                }
            }
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    get pipeline(): GPURenderPipeline {
        return this._shadowRenderPipeline;
    }

    get getBindGroup(): GPUBindGroup {
        return this._shadowRenderBindGroup;
    }

    get shadowMapTexture(): GPUTexture {
        return this._shadowMapTexture;
    }
}