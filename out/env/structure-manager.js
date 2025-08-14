import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class StructureManager {
    //Props
    gap = 0.8;
    size = {
        w: 0.05,
        h: 0.05,
        d: 0.05,
    };
    //
    async createFromPattern(pattern, position, createBlock, rotation) {
        const blocks = [];
        const colliders = [];
        for (let y = 0; y < pattern.length; y++) {
            const row = pattern[y].trimEnd();
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                const isBlock = char === '#';
                if (!isBlock)
                    continue;
                const pos = vec3.fromValues(position[0] + x * this.gap, position[1] + (pattern.length - y) * this.gap, position[2]);
                const { block, collider } = await createBlock(pos, isBlock, rotation);
                if (block)
                    blocks.push(block);
                if (collider)
                    colliders.push(collider);
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
