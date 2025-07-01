import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
export class Ground {
    device;
    loader;
    blocks;
    count = 5;
    pos = {
        x: 0,
        y: -2,
        z: 0
    };
    size = {
        w: 0.2,
        h: 0.2,
        d: 0.2
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
                mat4.translate(block.modelMatrix, block.modelMatrix, [
                    this.pos.x + x * 3,
                    this.pos.y,
                    this.pos.z + z * 3
                ]);
                mat4.scale(block.modelMatrix, block.modelMatrix, [this.size.w, this.size.h, this.size.d]);
                this.blocks.push(block);
            }
        }
    }
    getBlocks() {
        return this.blocks;
    }
    async init() {
        await this.createGround();
    }
}
