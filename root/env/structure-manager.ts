import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collision/collider.js";
import { EnvBufferData } from "./env-buffers.js";

export class StructureManager {
    //Props
    private size = {
        w: 1.0,
        h: 1.0,
        d: 1.0,
    }

    private gap = 0.8;

    public async createFromPattern(
        pattern: string[],
        position: vec3,
        createBlock: (pos: vec3) => Promise<{
            block: EnvBufferData,
            collider: BoxCollider
        }>
    ): Promise<{
        blocks: EnvBufferData[];
        colliders: BoxCollider[];
    }> {
        const blocks: EnvBufferData[] = [];
        const colliders: BoxCollider[] = [];

        for(let y = 0; y < pattern.length; y++) {
            const row = pattern[y];

            for(let x = 0; x < row.length; x++) {
                if(row[x] === '#') {
                    const pos = vec3.fromValues(
                        position[0] + x * this.gap,
                        position[1] + (pattern.length - y - 1) * this.gap,
                        position[2]
                    );

                    const { block, collider } = await createBlock(pos);
                    blocks.push(block);
                    colliders.push(collider);
                }
            }
        }

        return { blocks, colliders }
    }

    public getSize(): { w: number, h: number, d: number } {
        return this.size;
    }

    public getGap(): number {
        return this.gap;
    }
}