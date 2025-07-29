import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { getBindGroups } from "../render.js";
export class ShadowRenderer {
    isInit = false;
    shaderLoader;
    pipelines = null;
    depthTexture = null;
    buffers = null;
    bindGroups = null;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async createBuffers(device) {
        const vpUniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const modelStorageBuffer = device.createBuffer({
            size: 64 * 100, // Space for 100 objects
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const normalStorageBuffer = device.createBuffer({
            size: 64 * 100,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const colorStorageBuffer = device.createBuffer({
            size: 16 * 100,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const lightProjectionBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const materialBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        return {
            vpUniformBuffer,
            modelStorageBuffer,
            normalStorageBuffer,
            colorStorageBuffer,
            lightProjectionBuffer,
            materialBuffer
        };
    }
    async createBindGroups(device) {
        if (!this.pipelines || !this.buffers || !this.depthTexture) {
            throw new Error("Initialize pipelines and buffers first");
        }
        const sampler = device.createSampler({ compare: 'less' });
        const depthTextureView = this.depthTexture.createView();
        const { shapePipeline, depthPipeline } = this.pipelines;
        const { vpUniformBuffer, modelStorageBuffer, normalStorageBuffer, colorStorageBuffer, lightProjectionBuffer, materialBuffer } = this.buffers;
        const vertexLayout = shapePipeline.getBindGroupLayout(0);
        const fragLayout = shapePipeline.getBindGroupLayout(1);
        const shadowLayout = depthPipeline.getBindGroupLayout(0);
        const vertexBindGroup = device.createBindGroup({
            layout: vertexLayout,
            entries: [
                { binding: 0, resource: { buffer: vpUniformBuffer } },
                { binding: 1, resource: { buffer: modelStorageBuffer } },
                { binding: 2, resource: { buffer: normalStorageBuffer } },
                { binding: 3, resource: { buffer: lightProjectionBuffer } },
                { binding: 4, resource: { buffer: colorStorageBuffer } }
            ]
        });
        const fragBindGroup = device.createBindGroup({
            layout: fragLayout,
            entries: [
                { binding: 0, resource: { buffer: lightProjectionBuffer } },
                { binding: 1, resource: { buffer: materialBuffer } },
                { binding: 2, resource: depthTextureView },
                { binding: 3, resource: sampler }
            ]
        });
        const shadowBindGroup = device.createBindGroup({
            layout: shadowLayout,
            entries: [
                { binding: 0, resource: { buffer: lightProjectionBuffer } },
                { binding: 1, resource: { buffer: modelStorageBuffer } },
                { binding: 2, resource: { buffer: normalStorageBuffer } },
                { binding: 3, resource: { buffer: lightProjectionBuffer } },
                { binding: 4, resource: { buffer: colorStorageBuffer } }
            ]
        });
        return { vertex: vertexBindGroup, frag: fragBindGroup, shadow: shadowBindGroup };
    }
    async createPipelines(canvas, device) {
        this.depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        const { vertexShader, fragShader, depthShader } = await this.loadShaders();
        const { shadowMapBindGroupLayout, depthBindGroupLayout } = await getBindGroups();
        const shapePipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [shadowMapBindGroupLayout, depthBindGroupLayout]
            }),
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [{
                        arrayStride: 20, // 3 position + 2 UV
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x3' }, // Position
                            { shaderLocation: 1, offset: 12, format: 'float32x2' } // UV
                        ]
                    }]
            },
            fragment: {
                module: fragShader,
                entryPoint: 'main',
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
                frontFace: 'ccw'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less-equal',
                format: 'depth24plus'
            }
        });
        const depthPipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [shadowMapBindGroupLayout]
            }),
            vertex: {
                module: depthShader,
                entryPoint: 'main',
                buffers: [{
                        arrayStride: 20, // Same as above
                        attributes: [
                            { shaderLocation: 0, offset: 0, format: 'float32x3' },
                            { shaderLocation: 1, offset: 12, format: 'float32x2' }
                        ]
                    }]
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
                frontFace: 'ccw'
            }
        });
        return { shapePipeline, depthPipeline };
    }
    async loadShaders() {
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
    async updateLightProjection(device, lightViewProj) {
        if (!this.buffers)
            return;
        device.queue.writeBuffer(this.buffers.lightProjectionBuffer, 0, lightViewProj);
    }
    async draw(commandEncoder, device, objects) {
        if (!this.isInit || !this.pipelines || !this.buffers || !this.bindGroups) {
            throw new Error('ShadowRenderer not initialized!');
        }
        // Filter out invalid objects and ensure all required properties exist
        const validObjects = objects.filter(obj => obj &&
            obj.vertexBuffer &&
            obj.indexBuffer &&
            obj.indexCount > 0 &&
            obj.modelMatrix);
        if (validObjects.length === 0) {
            console.warn('No valid shadow objects to render');
            return;
        }
        // Convert matrices to flat number arrays with proper error handling
        const modelMatrices = validObjects.flatMap(obj => {
            if (!obj.modelMatrix) {
                console.warn('Object missing modelMatrix', obj);
                return Array(16).fill(0); // Fallback identity matrix
            }
            return Array.from(obj.modelMatrix);
        });
        const normalMatrices = validObjects.flatMap(obj => {
            if (!obj.normalMatrix) {
                // Calculate normal matrix if not provided
                const normal = mat4.create();
                mat4.invert(normal, obj.modelMatrix);
                mat4.transpose(normal, normal);
                return Array.from(normal);
            }
            return Array.from(obj.normalMatrix);
        });
        const colors = validObjects.flatMap(obj => obj.color ? [...obj.color, 1] : [1, 1, 1, 1]);
        try {
            // Create typed arrays for buffer updates
            const modelArray = new Float32Array(modelMatrices);
            const normalArray = new Float32Array(normalMatrices);
            const colorArray = new Float32Array(colors);
            // Update buffers
            device.queue.writeBuffer(this.buffers.modelStorageBuffer, 0, modelArray.buffer, modelArray.byteOffset, modelArray.byteLength);
            device.queue.writeBuffer(this.buffers.normalStorageBuffer, 0, normalArray.buffer, normalArray.byteOffset, normalArray.byteLength);
            device.queue.writeBuffer(this.buffers.colorStorageBuffer, 0, colorArray.buffer, colorArray.byteOffset, colorArray.byteLength);
            // Create shadow pass
            const shadowPass = commandEncoder.beginRenderPass({
                colorAttachments: [],
                depthStencilAttachment: {
                    view: this.depthTexture.createView(),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store'
                }
            });
            shadowPass.setPipeline(this.pipelines.depthPipeline);
            shadowPass.setBindGroup(0, this.bindGroups.shadow);
            // Draw each valid object
            for (const obj of validObjects) {
                shadowPass.setVertexBuffer(0, obj.vertexBuffer);
                shadowPass.setIndexBuffer(obj.indexBuffer, 'uint16');
                shadowPass.drawIndexed(obj.indexCount);
            }
            shadowPass.end();
        }
        catch (error) {
            console.error('Error in shadow rendering:', error);
            throw error;
        }
    }
    async init(canvas, device) {
        if (this.isInit)
            return;
        this.pipelines = await this.createPipelines(canvas, device);
        this.buffers = await this.createBuffers(device);
        this.bindGroups = await this.createBindGroups(device);
        this.isInit = true;
    }
}
