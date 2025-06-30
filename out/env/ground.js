import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { initEnvBuffers } from "./env-buffers.js";
export class Ground {
    device;
    size = 10;
    tiles;
    scale = {
        w: 1,
        h: 1,
        d: 1
    };
    pos = {
        x: 8,
        y: -2,
        z: 5
    };
    constructor(device) {
        this.device = device;
        this.tiles = [];
    }
    async drawGround() {
        const baseMatrix = mat4.create();
        mat4.scale(baseMatrix, baseMatrix, [this.scale.w, this.scale.h, this.scale.d]);
        mat4.translate(baseMatrix, baseMatrix, [this.pos.x, this.pos.y, this.pos.z]);
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                const tile = await initEnvBuffers(this.device);
                mat4.copy(tile.modelMatrix, baseMatrix);
                mat4.translate(tile.modelMatrix, tile.modelMatrix, [
                    x - this.size / 2,
                    0,
                    z - this.size / 2
                ]);
                this.tiles.push(tile);
            }
        }
    }
    getTiles() {
        return this.tiles;
    }
    async init() {
        await this.drawGround();
    }
}
