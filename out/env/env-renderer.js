import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { Ground } from "./ground.js";
export class EnvRenderer {
    device;
    loader;
    //Items
    ground;
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
    }
    async renderEnv(passEncoder, uniformBuffer, viewProjectionMatrix, bindGroup) {
        //Ground
        const blocks = this.ground.getBlocks();
        for (let i = 0; i < blocks.length; i++) {
            const data = blocks[i];
            const num = 256;
            const offset = num * (i + 1);
            await this.drawObject(passEncoder, data, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
        }
        //
    }
    async drawObject(passEncoder, buffers, uniformBuffer, viewProjectionMatrix, bindGroup, offset) {
        const mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, viewProjectionMatrix, buffers.modelMatrix);
        this.device.queue.writeBuffer(uniformBuffer, offset, mvpMatrix);
        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.drawIndexed(buffers.indexCount);
    }
    async init() {
        this.ground = new Ground(this.device, this.loader);
        await this.ground.init();
    }
}
