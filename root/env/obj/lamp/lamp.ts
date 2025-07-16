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

interface Uniforms {
    mvpMatrix: Float32Array;
    emissiveStrength: number;
    padding: Float32Array;
}

@Injectable()
export class Lamp {
    private device: GPUDevice;
    private passEncoder: GPURenderPassEncoder;
    private loader: Loader;
    private buffers?: EnvBufferData;
    private shaderLoader: ShaderLoader;
    private modelMatrix: mat4;

    private emissiveStrength: number = 2.5;
    private windManager: WindManager;
    public wire: Wire;
    private lightningManager: LightningManager;

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
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return lamp;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async createLamp(): Promise<void> {
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

                const lx = x + 3;
                const ly = y;
                const lz = z + 5;

                const light = new PointLight(
                    vec3.fromValues(lx, ly, lz),
                    colorArray,
                    1.0,
                    7.0
                );

                this.lightningManager.addPointLight('point', light);
                this.lightningManager.updatePointLightBuffer();

                const uniformData = new Float32Array(20);
                const mvpMatrix = mat4.create();
                uniformData.set(mvpMatrix, 0);
                uniformData[16] = this.emissiveStrength;
                uniformData.set([0, 0, 0], 17);

                const uniformBuffer = this.device.createBuffer({
                    size: uniformData.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                    mappedAtCreation: true
                });
                new Float32Array(uniformBuffer.getMappedRange()).set(uniformData);
                uniformBuffer.unmap();
            //
        } catch(err) {
            console.error(err);
            throw err;
        }
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

    public async init(): Promise<void> {
        await this.initShaders();
        this.buffers = await this.loadAssets();
        this.createLamp();
        await this.wire.init();
    }
}