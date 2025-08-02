import { getBindGroups } from "../render.js";
import { getPointLightViewProjectionMatrices } from "../utils/matrix-utils.js";
export class ShadowRenderer {
    isInit = false;
    initPromise = null;
    pipelines = null;
    bindGroups = null;
    depthTexture = null;
    bufferData;
    shaderLoader;
    faceMatricesBuffer;
    faceMatricesBindGroup;
    constructor(bufferData, shaderLoader) {
        this.bufferData = bufferData;
        this.shaderLoader = shaderLoader;
    }
    async cubeBindGroup(device) {
        return device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'read-only-storage' }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'depth' }
                },
                {
                    binding: 8,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'comparison' }
                }
            ]
        });
    }
    async initMatricesBuffer(device) {
        const bindGroupLayout = await this.cubeBindGroup(device);
        this.faceMatricesBuffer = device.createBuffer({
            size: 6 * 16 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });
        const storageBuffer = device.createBuffer({
            size: 16 * 4,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: false
        });
        const depthTexture = device.createTexture({
            size: [1, 1],
            format: 'depth24plus',
            usage: GPUTextureUsage.TEXTURE_BINDING
        });
        const sampler = device.createSampler({
            compare: 'less'
        });
        this.faceMatricesBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.faceMatricesBuffer }
                },
                {
                    binding: 1,
                    resource: { buffer: storageBuffer }
                },
                {
                    binding: 4,
                    resource: { buffer: this.faceMatricesBuffer }
                },
                {
                    binding: 5,
                    resource: { buffer: storageBuffer }
                },
                {
                    binding: 6,
                    resource: { buffer: this.faceMatricesBuffer }
                },
                {
                    binding: 7,
                    resource: depthTexture.createView()
                },
                {
                    binding: 8,
                    resource: sampler
                }
            ]
        });
    }
    async createPipelines(canvas, device) {
        try {
            this.depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            const { vertexShader, fragShader, depthShader } = await this.loadShaders();
            const { pointLightBindGroupLayout, lightningBindGroupLayout, textureBindGroupLayout } = await getBindGroups();
            const bindGroupLayout = await this.cubeBindGroup(device);
            //Shape
            const shapePipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [
                        pointLightBindGroupLayout,
                        lightningBindGroupLayout,
                        textureBindGroupLayout
                    ]
                }),
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
                    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back',
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                }
            });
            //Depth
            const depthPipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [pointLightBindGroupLayout]
                }),
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
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back',
                }
            });
            //Cube
            const cubeShadowPipeline = device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [bindGroupLayout]
                }),
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
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back'
                }
            });
            return {
                shapePipeline,
                depthPipeline,
                cubeShadowPipeline
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async loadShaders() {
        try {
            const [vertexSrc, fragSrc, depthSrc] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-depth.wgsl')
            ]);
            return {
                vertexShader: vertexSrc,
                fragShader: fragSrc,
                depthShader: depthSrc
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async draw(device, commandEncoder, light, objects) {
        if (this.initPromise)
            await this.initPromise;
        if (!this.pipelines?.cubeShadowPipeline || !light.shadowMap)
            throw new Error('err');
        const viewProjMatrices = getPointLightViewProjectionMatrices(light.position, 0.1, light.range);
        const matrixData = new Float32Array(6 * 16);
        viewProjMatrices.forEach((matrix, i) => matrixData.set(matrix, i * 16));
        device.queue.writeBuffer(this.faceMatricesBuffer, 0, matrixData);
        for (let face = 0; face < 6; face++) {
            const shadowMapView = light.shadowMap.createView({
                dimension: '2d',
                baseArrayLayer: face,
                arrayLayerCount: 1
            });
            const shadowPass = commandEncoder.beginRenderPass({
                colorAttachments: [],
                depthStencilAttachment: {
                    view: shadowMapView,
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store',
                }
            });
            shadowPass.setPipeline(this.pipelines.cubeShadowPipeline);
            shadowPass.setBindGroup(0, this.faceMatricesBindGroup);
            for (const obj of objects) {
                shadowPass.setVertexBuffer(0, obj.vertex);
                shadowPass.setIndexBuffer(obj.index, 'uint16');
                shadowPass.drawIndexed(obj.indexCount);
            }
            shadowPass.end();
        }
    }
    async init(canvas, device) {
        try {
            if (this.isInit)
                return;
            this.initPromise = (async () => {
                this.pipelines = await this.createPipelines(canvas, device);
                this.initMatricesBuffer(device);
                this.isInit = true;
                this.initPromise = null;
            })();
            await this.initPromise;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
