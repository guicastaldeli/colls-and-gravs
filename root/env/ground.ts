import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "./env-buffers.js";

export class Ground {
    private device: GPUDevice;

    private blocks: EnvBufferData[];
    private count: number = 4;

    pos = {
        x: 0,
        y: -2,
        z: 0
    }

    constructor(device: GPUDevice) {
        this.device = device;
        this.blocks = [];
    }

    private async createGround() {
        for(let x = 0; x < this.count; x++) {
            for(let z = 0; z < this.count; z++) {
                const block = await initEnvBuffers(this.device);

                mat4.translate(
                    block.modelMatrix, 
                    block.modelMatrix, 
                [
                    this.pos.x + x * 1.1,
                    this.pos.y,
                    this.pos.z + z * 1.1
                ]);

                this.blocks.push(block);
            }
        }
    }

    public getBlocks(): EnvBufferData[] {
        return this.blocks;
    }

    public async init(): Promise<void> {
        await this.createGround();
    }
}