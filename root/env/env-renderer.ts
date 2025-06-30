import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";

import { EnvBufferData } from "./env-buffers.js";
import { Ground } from "./ground.js";

export class EnvRenderer {
    private device: GPUDevice;

    //Items
    private ground?: Ground;

    constructor(device: GPUDevice,) {
        this.device = device;
    }

    public async renderEnv(
        passEncoder: GPURenderPassEncoder,
        uniformBuffer: GPUBuffer,
        viewProjectionMatrix: mat4,
        bindGroup: GPUBindGroup
    ): Promise<void> {
        //Ground
            if(!this.ground) return;

            const groundTiles = this.ground.getTiles();

            for(const tile of groundTiles) {
                await this.drawObject(passEncoder, tile, uniformBuffer, viewProjectionMatrix, bindGroup);
            }
        //
    }

    private async drawObject(
        passEncoder: GPURenderPassEncoder,
        buffers: EnvBufferData,
        uniformBuffer: GPUBuffer,
        viewProjectionMatrix: mat4,
        bindGroup: GPUBindGroup
    ): Promise<void> {
        const mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, viewProjectionMatrix, buffers.modelMatrix);
        this.device.queue.writeBuffer(uniformBuffer, 256, mvpMatrix as ArrayBuffer);

        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [256]);
        passEncoder.drawIndexed(buffers.indexCount);
    }

    public async init(): Promise<void> {
        this.ground = new Ground(this.device);
        await this.ground.init();
    }
}