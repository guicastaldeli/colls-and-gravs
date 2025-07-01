import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "./env-buffers.js";
import { Loader } from "../loader.js";

export class Ground {
    private device: GPUDevice;
    private loader: Loader;

    private blocks: EnvBufferData[];
    private count: number = 5;

    pos = {
        x: 0,
        y: -2,
        z: 0
    }

    size = {
        w: 1,
        h: 1,
        d: 1
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.blocks = [];
    }

    private async createGround() {
        const model = await this.loader.parser('./assets/env/obj/cube-test.obj');
        this.loader.setTextureUrl('./assets/env/textures/cube-test.png');

        for(let x = 0; x < this.count; x++) {
            for(let z = 0; z < this.count; z++) {
                const block: EnvBufferData = {
                    vertex: model.vertex,
                    color: model.color,
                    index: model.index,
                    indexCount: model.indexCount,
                    modelMatrix: mat4.create()
                }

                mat4.translate(
                    block.modelMatrix, 
                    block.modelMatrix, 
                [
                    this.pos.x + x * 3,
                    this.pos.y,
                    this.pos.z + z * 3
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