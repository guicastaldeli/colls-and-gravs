import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { BoxCollider, Collider, ICollidable } from "../collider.js";

export class Ground implements ICollidable {
    private device: GPUDevice;
    private loader: Loader;

    private blocks: EnvBufferData[];
    private count: number = 10;

    private _Collider: BoxCollider[] = [];

    pos = {
        x: 0,
        y: -2,
        z: 0,
        gap: () => 0.8
    }

    size = {
        w: 0.2,
        h: 0.2,
        d: 0.2
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.blocks = [];
    }

    private async createGround() {
        const model = await this.loader.parser('./assets/env/obj/404.obj');
        const texture = await this.loader.textureLoader('./assets/env/textures/404.png');
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

                mat4.identity(block.modelMatrix);

                mat4.translate(
                    block.modelMatrix, 
                    block.modelMatrix, 
                [
                    (this.pos.x + x) * this.pos.gap(),
                    this.pos.y,
                    (this.pos.z + z) * this.pos.gap()
                ]);

                mat4.scale(
                    block.modelMatrix,
                    block.modelMatrix,
                    [this.size.w, this.size.h, this.size.d]
                )

                const collider = new BoxCollider(
                    [this.size.w, this.size.h, this.size.d],
                    [
                        (this.pos.x + x) * this.pos.gap(),
                        this.pos.y,
                        (this.pos.z + z) * this.pos.gap()
                    ]
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

    public getAllCOlliders(): { collider: Collider, position: vec3 }[] {
        return this._Collider.map((collider, i) => {
            const x = (this.pos.x + (i % this.count)) * this.pos.gap();
            const z = (this.pos.z + Math.floor(i / this.count)) * this.pos.gap();
            return {
                collider,
                position: vec3.fromValues(x, this.pos.y, z)
            }
        });
    }

    public async init(): Promise<void> {
        await this.createGround();
    }
}