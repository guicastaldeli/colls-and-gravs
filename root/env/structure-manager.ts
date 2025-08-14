import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collision/collider.js";
import { EnvBufferData } from "./env-buffers.js";

export class StructureManager {
    //Props
        private gap: number = 0.8;

        private size = {
            w: 0.05,
            h: 0.05,
            d: 0.05,
        }
    //

    public async createFromPattern(
        pattern: string[],
        position: vec3,
        createBlock: (
            pos: vec3,
            isBlock: boolean,
            rotation?: {
                axis: 'x' | 'y' | 'z';
                angle: number;
            }
        ) => Promise<{
            block: EnvBufferData | null,
            collider: BoxCollider | null
        }>,
        rotation?: {
            axis: 'x' | 'y' | 'z';
            angle: number;
        }
    ): Promise<{
        blocks: EnvBufferData[];
        colliders: BoxCollider[];
    }> {
        const blocks: EnvBufferData[] = [];
        const colliders: BoxCollider[] = [];

        for(let y = 0; y < pattern.length; y++) {
            const row = pattern[y].trimEnd();

            for(let x = 0; x < row.length; x++) {
                const char = row[x];
                const isBlock = char === '#';
                if(!isBlock) continue;
                    
                const pos = vec3.fromValues(
                    position[0] + x * this.gap,
                    position[1] + (pattern.length - y) * this.gap,
                    position[2]
                );
                
                const { block, collider } = await createBlock(pos, isBlock, rotation);
                if(block) blocks.push(block);
                if(collider) colliders.push(collider);
            }
        }

        return { blocks, colliders }
    }

    public getSize(): { 
        w: number, 
        h: number, 
        d: number 
    } {
        return this.size;
    }

    public getGap(): number {
        return this.gap;
    }
}