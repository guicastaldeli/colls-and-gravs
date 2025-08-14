import { mat3, mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider, CollisionResponse } from "../collision/collider.js";
export class Ground {
    renderer;
    device;
    loader;
    blocks;
    count = 20;
    _Collider = [];
    pos = {
        x: 0,
        y: 0,
        z: 0,
        gap: () => 1.0
    };
    size = {
        w: 0.05,
        h: 0.05,
        d: 0.05
    };
    constructor(device, loader, renderer) {
        this.device = device;
        this.loader = loader;
        this.renderer = renderer;
        this.blocks = [];
    }
    async createGround() {
        const model = await this.loader.parser('./.assets/env/obj/terrain.obj');
        const texture = await this.loader.textureLoader('./.assets/env/textures/terrain.png');
        const sampler = this.loader.createSampler();
        for (let x = 0; x < this.count; x++) {
            for (let z = 0; z < this.count; z++) {
                const block = {
                    vertex: model.vertex,
                    color: model.color,
                    index: model.index,
                    indexCount: model.indexCount,
                    modelMatrix: mat4.create(),
                    normalMatrix: mat3.create(),
                    texture: texture,
                    sampler: sampler,
                    isLamp: [0.0, 0.0, 0.0]
                };
                const position = vec3.fromValues((this.pos.x + x) * this.pos.gap(), this.pos.y, (this.pos.z + z) * this.pos.gap());
                mat4.identity(block.modelMatrix);
                mat4.translate(block.modelMatrix, block.modelMatrix, position);
                mat4.scale(block.modelMatrix, block.modelMatrix, [this.size.w, this.size.h, this.size.d]);
                mat4.copy(block.modelMatrix, block.modelMatrix);
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
        return new BoxCollider([this.count * this.pos.gap(), 0.1, this.count * this.pos.gap()], [0, this.pos.y, 0]);
    }
    getCollisionResponse(other) {
        return CollisionResponse.BLOCK;
    }
    getCollisionInfo() {
        return {
            type: 'ground',
            position: this.getPosition()
        };
    }
    getAllColliders() {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }
    getGroundLevelY(x, z) {
        return this.pos.y + 0.3;
    }
    async init() {
        await this.createGround();
    }
}
