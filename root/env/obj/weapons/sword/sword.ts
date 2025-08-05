import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../../object-manager.js";
import { Loader } from "../../../../loader.js";
import { EnvBufferData } from "../../../env-buffers.js";

@Injectable()
export class Sword {
    private loader: Loader;
    private modelMatrix: mat4;
    private normalMatrix: mat3 = mat3.create();
    private model: any = null;
    private texture: GPUTexture | null = null;

    private pos = {
        x: 5.0,
        y: 1.0,
        z: 5.0
    }

    private size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    constructor(loader: Loader) {
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }

    private async loadAssets(): Promise<boolean> {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
            ]);

            if(!model || !texture) throw new Error('err');
            this.model = model;
            this.texture = texture;
            return true;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async setSword(): Promise<void> {
        try {
            const position = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
            const scale = vec3.fromValues(this.size.w, this.size.h, this.size.d);

            mat4.identity(this.modelMatrix);
            mat4.translate(this.modelMatrix, this.modelMatrix, position);
            mat4.scale(this.modelMatrix, this.modelMatrix, scale);
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async getBuffers(): Promise<EnvBufferData | undefined> {
        if(!this.model || !this.texture) {
            console.warn('Sword not loaded');
            return undefined;
        }

        try {
            await this.setSword();

            const buffers: EnvBufferData = {
                vertex: this.model.vertex,
                color: this.model.color,
                index: this.model.index,
                indexCount: this.model.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: this.normalMatrix,
                texture: this.texture,
                sampler: this.loader.createSampler(),
                isLamp: [0.0, 0.0, 0.0]
            }

            return buffers;
        } catch(err) {
            console.error('Err sword', err);
            throw err;
        }
    }

    public async update(): Promise<void> {

    }

    public async init(): Promise<void> {
        try {
            await this.loadAssets();
            await this.setSword();
        } catch(err) {
            console.log(err);
            throw err;
        }
    }
}