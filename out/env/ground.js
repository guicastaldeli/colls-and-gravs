import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collider.js";
export class Ground {
    device;
    loader;
    blocks;
    count = 20;
    _Collider = [];
    pos = {
        x: 0,
        y: 0,
        z: 0,
        gap: () => 0.8
    };
    size = {
        w: 0.05,
        h: 0.05,
        d: 0.05
    };
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
        this.blocks = [];
    }
    async createGround() {
        const model = await this.loader.parser('./assets/env/obj/404.obj');
        const texture = await this.loader.textureLoader('./assets/env/textures/404.png');
        const sampler = this.loader.createSampler();
        for (let x = 0; x < this.count; x++) {
            for (let z = 0; z < this.count; z++) {
                const block = {
                    vertex: model.vertex,
                    color: model.color,
                    index: model.index,
                    indexCount: model.indexCount,
                    modelMatrix: mat4.create(),
                    texture: texture,
                    sampler: sampler
                };
                const position = vec3.fromValues((this.pos.x + x) * this.pos.gap(), this.pos.y, (this.pos.z + z) * this.pos.gap());
                mat4.identity(block.modelMatrix);
                mat4.translate(block.modelMatrix, block.modelMatrix, position);
                mat4.scale(block.modelMatrix, block.modelMatrix, [this.size.w, this.size.h, this.size.d]);
                const collider = new BoxCollider([this.pos.gap(), this.pos.gap(), this.pos.gap()], vec3.fromValues(position[0], position[1], position[2]));
                this.blocks.push(block);
                this._Collider.push(collider);
            }
        }
    }
    getBlocks() {
        return this.blocks;
    }
    getPosition() {
        return vec3.fromValues(0, 0, 0);
    }
    getCollider() {
        return this._Collider[0];
    }
    getAllColliders() {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider)['_offset'],
            type: 'ground'
        }));
    }
    async init() {
        await this.createGround();
    }
}
