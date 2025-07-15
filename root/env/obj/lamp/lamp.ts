import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../object-manager.js";
import { EnvBufferData, initEnvBuffers } from "../../env-buffers.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Wire } from "./wire.js";

@Injectable()
export class Lamp {
    private device: GPUDevice;
    private loader: Loader;
    private buffers?: EnvBufferData;
    private shaderLoader: ShaderLoader;
    private modelMatrix: mat4;

    private windManager: WindManager;
    public wire: Wire;

    lampPos = {
        x: 3,
        y: 4,
        z: 2
    }

    wirePos = {
        x: 1,
        y: 1,
        z: 0
    }

    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    }

    constructor(
        device: GPUDevice,
        loader: Loader,
        shaderLoader: ShaderLoader,
        windManager: WindManager
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;

        this.modelMatrix = mat4.create();
        
        this.windManager = windManager;
        this.wire = new Wire(windManager, loader);
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

            const position = vec3.fromValues(this.lampPos.x, this.lampPos.y, this.lampPos.z);
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
        } catch(err) {
            console.error(err);
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
        this.buffers = await this.loadAssets();
        this.createLamp();
        await this.wire.init(this.shaderLoader);
    }
}