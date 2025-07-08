import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class StructureManager {
    //Props
    size = {
        w: 0.5,
        h: 0.5,
        d: 0.5,
    };
    gap = 0.8;
    async createFromPattern(pattern, position, createBlock) {
        const blocks = [];
        const colliders = [];
        for (let y = 0; y < pattern.length; y++) {
            const row = pattern[y];
            for (let x = 0; x < row.length; x++) {
                if (row[x] === '#') {
                    const pos = vec3.fromValues(position[0] + x * this.gap, position[1] + (pattern.length - y - 1) * this.gap, position[2]);
                    const { block, collider } = await createBlock(pos);
                    blocks.push(block);
                    colliders.push(collider);
                }
            }
        }
        return { blocks, colliders };
    }
    getSize() {
        return this.size;
    }
    getGap() {
        return this.gap;
    }
}
