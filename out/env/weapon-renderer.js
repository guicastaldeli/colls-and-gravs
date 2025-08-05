import { mat3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
export class WeaponRenderer {
    device;
    loader;
    shaderLoader;
    objectManager;
    constructor(device, loader, shaderLoader, objectManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }
    async renderEnv(passEncoder, uniformBuffer, viewProjectionMatrix, bindGroup) {
        //Sword
        if (this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if (swordBuffers) {
                for (const buffer of swordBuffers) {
                    const num = 256;
                    const offset = num;
                    await this.drawObject(passEncoder, buffer, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
                }
            }
        }
    }
    async drawObject(passEncoder, buffers, uniformBuffer, viewProjectionMatrix, bindGroup, offset) {
        const mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, viewProjectionMatrix, buffers.modelMatrix);
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, buffers.modelMatrix);
        const uniformData = new Float32Array(16 + 16 + 12 + 4);
        uniformData.set(mvpMatrix, 0);
        uniformData.set(buffers.modelMatrix, 16);
        uniformData.set(normalMatrix, 32);
        this.device.queue.writeBuffer(uniformBuffer, offset, uniformData);
        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.drawIndexed(buffers.indexCount);
    }
    async get() {
        const renderers = [];
        if (this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if (swordBuffers)
                renderers.push(...swordBuffers);
        }
        return renderers;
    }
    async render(deltaTime) {
        if (this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}
