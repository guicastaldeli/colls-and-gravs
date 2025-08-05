import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../object-manager.js";
import { EnvBufferData, initEnvBuffers } from "../../env-buffers.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { Wire } from "./wire.js";
import { LightningManager } from "../../../lightning-manager.js";
import { PointLight } from "../../../lightning/point-light.js";
import { parseColor } from "../../../render.js";

@Injectable()
export class Lamp {
    private device: GPUDevice;
    private loader: Loader;
    private buffers?: EnvBufferData;
    private shaderLoader: ShaderLoader;
    private modelMatrix: mat4;

    public wire: Wire;
    private lightningManager: LightningManager;

    size = {
        w: 0.6,
        h: 0.6,
        d: 0.6
    }

    constructor(
        device: GPUDevice,
        loader: Loader,
        shaderLoader: ShaderLoader,
        lightningManager: LightningManager
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        
        this.modelMatrix = mat4.create();
        this.wire = new Wire(loader);
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
                sampler: this.loader.createSampler(),
                isLamp: [1.0, 1.0, 1.0]
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

            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, this.buffers.modelMatrix);
            this.buffers.normalMatrix = normalMatrix;
            
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
                    7.0
                );

                this.lightningManager.addPointLight('point', light);
                this.lightningManager.updatePointLightBuffer();
            //
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async getBuffers(): Promise<EnvBufferData[] | undefined> {
        const buffers: EnvBufferData[] = [];
        const wireBuffers = await this.wire.getBuffers();
        if(wireBuffers) buffers.push(...wireBuffers);
        if(this.buffers) buffers.push(this.buffers);
        return buffers;
    }
    
    public async init(): Promise<void> {
        await this.wire.init();
        this.buffers = await this.loadAssets();
        this.createLamp();
    }

    public update(): void {}
}