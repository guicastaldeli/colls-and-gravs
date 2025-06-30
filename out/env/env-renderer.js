import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { Ground } from "./ground.js";
export class EnvRenderer {
    device;
    //Items
    ground;
    constructor(device) {
        this.device = device;
    }
    async renderEnv(passEncoder, uniformBuffer, viewProjectionMatrix, bindGroup) {
        //Ground
        if (!this.ground)
            return;
        const groundTiles = this.ground.getTiles();
        for (const tile of groundTiles) {
            await this.drawObject(passEncoder, tile, uniformBuffer, viewProjectionMatrix, bindGroup);
        }
        //
    }
    async drawObject(passEncoder, buffers, uniformBuffer, viewProjectionMatrix, bindGroup) {
        const mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, viewProjectionMatrix, buffers.modelMatrix);
        this.device.queue.writeBuffer(uniformBuffer, 256, mvpMatrix);
        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [256]);
        passEncoder.drawIndexed(buffers.indexCount);
    }
    async init() {
        this.ground = new Ground(this.device);
        await this.ground.init();
    }
}
