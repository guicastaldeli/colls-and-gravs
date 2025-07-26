import { vec3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { getBindGroups } from "../render.js";
export class ShadowRenderer {
    isInit = false;
    shaderLoader;
    uniformBuffers;
    _shadowSampler;
    //Render
    _shadowRenderPipeline;
    _shadowRenderBindGroup;
    //Map
    _shadowMapPipeline;
    _shadowMapBindGroup;
    _shadowMapTexture;
    _shadowMapView;
    _shadowMapSize = 1024;
    lightPosition = vec3.fromValues(10, 15, 10);
    lightTarget = vec3.fromValues(0, 0, 0);
    shadowBias = 0.005;
    shadowRadius = 3.0;
    lightIntensity = 1.0;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async loadShaders() {
        try {
            const [vertexSrc, fragSrc, mapVertexSrc, mapFragSrc] = await Promise.all([
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
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async createMapShaders(device) {
        try {
            const { renderVertexShader, renderFragShader, mapVertexShader, mapFragShader } = await this.loadShaders();
            const renderVertexCode = device.createShaderModule({ code: renderVertexShader });
            const renderFragCode = device.createShaderModule({ code: renderFragShader });
            const mapVertexCode = device.createShaderModule({ code: mapVertexShader });
            const mapFragCode = device.createShaderModule({ code: mapFragShader });
            return {
                renderVertexShader: renderVertexCode,
                renderFragShader: renderFragCode,
                mapVertexShader: mapVertexCode,
                mapFragShader: mapFragCode
            };
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async init(device) {
        if (this.isInit)
            return;
        try {
            const { shadowBindGroupLayout, shadowMapBindGroupLayout } = await getBindGroups();
            const { renderVertexShader, renderFragShader, mapVertexShader, mapFragShader } = await this.createMapShaders(device);
            const renderShaders = {
                renderVertexShader: renderVertexShader,
                renderFragShader: renderFragShader
            };
            const mapShaders = {
                mapVertexShader: mapVertexShader,
                mapFragShader: mapFragShader
            };
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
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    updateLightPosition(position) {
        vec3.copy(this.lightPosition, position);
    }
    updateUniforms(device, objects) {
        const lightProjection = mat4.ortho(mat4.create(), -15, 15, -15, 15, 0.1, 50);
        const lightView = mat4.lookAt(mat4.create(), this.lightPosition, this.lightTarget, [0, 1, 0]);
        const lightViewProjection = mat4.multiply(mat4.create(), lightProjection, lightView);
        device.queue.writeBuffer(this.uniformBuffers[0], 0, lightViewProjection);
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
    async renderShadows(device, commandEncoder, objects, mainPassEncoder) {
        try {
            const { shadowBindGroupLayout } = await getBindGroups();
            const shadowCasters = objects.filter(obj => obj.position && obj.position[1] > 0.1);
            if (shadowCasters.length === 0)
                return;
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
            for (const obj of shadowCasters) {
                if (obj.vertex && obj.index) {
                    mainPassEncoder.setVertexBuffer(0, obj.vertex);
                    mainPassEncoder.setIndexBuffer(obj.index, 'uint16');
                    mainPassEncoder.drawIndexed(obj.indexCount);
                }
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    get pipeline() {
        return this._shadowRenderPipeline;
    }
    get getBindGroup() {
        return this._shadowRenderBindGroup;
    }
    get shadowMapTexture() {
        return this._shadowMapTexture;
    }
}
