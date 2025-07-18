import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../object-manager.js";
import { EnvBufferData, initEnvBuffers } from "../../env-buffers.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Wire } from "./wire.js";
import { LightningManager } from "../../../lightning-manager.js";
import { PointLight } from "../../../lightning/point-light.js";
import { parseColor } from "../../../render.js";

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule
}

@Injectable()
export class Lamp {
    private device: GPUDevice;
    private passEncoder: GPURenderPassEncoder;
    private loader: Loader;
    private buffers?: EnvBufferData;
    private shaderLoader: ShaderLoader;
    private modelMatrix: mat4;

    private emissiveStrength: number = 15.0;
    private windManager: WindManager;
    public wire: Wire;
    private lightningManager: LightningManager;

    private pipeline!: GPURenderPipeline;
    private uniformBuffer!: GPUBuffer;
    private bindGroup!: GPUBindGroup;

    size = {
        w: 0.2,
        h: 0.2,
        d: 0.2
    }

    constructor(
        device: GPUDevice,
        passEncoder: GPURenderPassEncoder,
        loader: Loader,
        shaderLoader: ShaderLoader,
        windManager: WindManager,
        lightningManager: LightningManager
    ) {
        this.device = device;
        this.passEncoder = passEncoder;
        this.loader = loader;
        this.shaderLoader = shaderLoader;

        this.modelMatrix = mat4.create();
        
        this.windManager = windManager;
        this.wire = new Wire(windManager, loader);
        this.lightningManager = lightningManager;
    }

    public getModelMatrix(): mat4 {
        return this.modelMatrix;
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);

            const lamp: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                normalMatrix: mat3.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return lamp;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async createLamp(passEncoder: GPURenderPassEncoder, viewProjectionMatrix: mat4): Promise<void> {
        try {
            if(!this.buffers) return;

            const x = this.wire.pos.x;
            const y = this.wire.pos.y;
            const z = this.wire.pos.z;

            const position = vec3.fromValues(x, y, z);
            mat4.identity(this.buffers.modelMatrix);
            mat4.translate(this.buffers.modelMatrix, this.buffers.modelMatrix, position);
            
            mat4.scale(
                this.buffers.modelMatrix,
                this.buffers.modelMatrix,
                [
                    this.size.w,
                    this.size.h,
                    this.size.d
                ]
            );

            mat4.copy(this.modelMatrix, this.buffers.modelMatrix);

            //Lightning
                const color = 'rgb(255, 255, 255)';
                const colorArray = parseColor(color);

                const lx = x;
                const ly = y;
                const lz = z;

                const light = new PointLight(
                    vec3.fromValues(lx, ly, lz),
                    colorArray,
                    0.8,
                    8.0
                );

                this.lightningManager.addPointLight('point', light);
                this.lightningManager.updatePointLightBuffer();

                const mvpMatrix = mat4.create();
                mat4.multiply(mvpMatrix, viewProjectionMatrix, this.buffers.modelMatrix);

                const uniformData = new Float32Array(20);
                uniformData.set(mvpMatrix, 0);
                uniformData[16] = this.emissiveStrength;
                uniformData.set([0, 0, 0], 17);

                this.uniformBuffer = this.device.createBuffer({
                    size: uniformData.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                });

                this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
                passEncoder.setPipeline(this.pipeline);
                passEncoder.setBindGroup(0, this.bindGroup);
                passEncoder.setVertexBuffer(0, this.buffers.vertex);
                passEncoder.setIndexBuffer(this.buffers.index, 'uint32');
                passEncoder.drawIndexed(this.buffers.indexCount);
            //
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async createPipeline(): Promise<void> {
        const shaders = await this.initShaders();

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                }
            ]
        });

        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });

        const vertexBuffers: GPUVertexBufferLayout[] = [{
            arrayStride: 5 * 4,
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
                }
            ]
        }];

        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaders.vertexShader,
                entryPoint: 'main',
                buffers: vertexBuffers
            },
            fragment: {
                module: shaders.fragShader,
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
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        if(!this.buffers) return;

        const uniformData = new Float32Array(20);
        this.uniformBuffer = this.device.createBuffer({
            size: uniformData.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.uniformBuffer }
                },
                {
                    binding: 1,
                    resource: this.buffers.texture.createView()
                },
                {
                    binding: 2,
                    resource: this.buffers.sampler
                }
            ]
        });
    }

    private async initShaders(): Promise<Shaders> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                this.shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl'),
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

    public async getBuffers(): Promise<EnvBufferData[] | undefined> {
        const buffers: EnvBufferData[] = [];
        if(this.buffers) buffers.push(this.buffers);
        const wireBuffers = await this.wire.getBuffers();
        if(wireBuffers) buffers.push(...wireBuffers);
        return buffers;
    }

    public async update(
        deltaTime: number,
        passEncoder?: GPURenderPassEncoder,
        viewProjectionMatrix?: mat4
    ): Promise<void> {
        if(!passEncoder || !viewProjectionMatrix) throw new Error('err');
        await this.wire.update(this.device, deltaTime);
    }

    public async init(passEncoder: GPURenderPassEncoder, viewProjectionMatrix: mat4): Promise<void> {
        await this.initShaders();
        this.buffers = await this.loadAssets();
        await this.createPipeline();
        this.createLamp(passEncoder, viewProjectionMatrix);
        await this.wire.init();
    }
}