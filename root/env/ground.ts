import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { BoxCollider, Collider, ICollidable } from "../collider.js";

export class Ground implements ICollidable {
    private device: GPUDevice;
    private loader: Loader;

    private blocks: EnvBufferData[];
    private count: number = 20;

    private _Collider: BoxCollider[] = [];

    pos = {
        x: 0,
        y: 0,
        z: 0,
        gap: () => 0.8
    }

    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.blocks = [];
    }

    private async createGround() {
        const model = await this.loader.parser('./assets/env/obj/smile.obj');
        const texture = await this.loader.textureLoader('./assets/env/textures/smile.png');
        const sampler = this.loader.createSampler();

        for(let x = 0; x < this.count; x++) {
            for(let z = 0; z < this.count; z++) {
                const block: EnvBufferData = {
                    vertex: model.vertex,
                    color: model.color,
                    index: model.index,
                    indexCount: model.indexCount,
                    modelMatrix: mat4.create(),
                    texture: texture,
                    sampler: sampler
                }

                const position = vec3.fromValues(
                    (this.pos.x + x) * this.pos.gap(),
                    this.pos.y,
                    (this.pos.z + z) * this.pos.gap()
                );

                mat4.identity(block.modelMatrix);

                mat4.translate(
                    block.modelMatrix, 
                    block.modelMatrix,
                    position
                );

                mat4.scale(
                    block.modelMatrix,
                    block.modelMatrix,
                    [this.size.w, this.size.h, this.size.d]
                )

                const collider = new BoxCollider(
                    [this.size.w * this.pos.gap(), this.size.h * 6, this.size.d * this.pos.gap()],
                    vec3.fromValues(position[0], position[1], position[2])
                );

                this.blocks.push(block);
                this._Collider.push(collider);
            }
        }
    }

    public getBlocks(): EnvBufferData[] {
        return this.blocks;
    }

    public getPosition(): vec3 {
        return vec3.fromValues(0, 0, 0);
    }

    public getCollider(): Collider {
        return this._Collider[0];
    }

    public getAllColliders(): { collider: Collider, position: vec3 }[] {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone((collider as BoxCollider))['_offset']
        }));
    }

    public async init(): Promise<void> {
        await this.createGround();
    }
}