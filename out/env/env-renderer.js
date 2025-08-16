import { mat3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { Walls } from "./walls.js";
import { Ground } from "./ground.js";
export class EnvRenderer {
    device;
    loader;
    shaderLoader;
    //Items
    walls;
    ground;
    //Objects
    objectManager;
    constructor(device, loader, shaderLoader, objectManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }
    async renderEnv(passEncoder, uniformBuffer, viewProjectionMatrix, bindGroup) {
        console.log('tst');
        //Ground
        const blocks = this.ground.getBlocks();
        for (let i = 0; i < blocks.length; i++) {
            const data = blocks[i];
            const num = 256;
            const offset = num * (i + 1);
            await this.drawObject(passEncoder, data, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
        }
        //Walls
        const walls = this.walls.getBlocks();
        for (let i = 0; i < walls.length; i++) {
            const data = walls[i];
            const num = 256;
            const offset = num * (i + 1);
            await this.drawObject(passEncoder, data, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
        }
        //Lamp
        if (this.objectManager) {
            const lampBuffers = await this.objectManager.setObjectBuffer('lamp');
            if (lampBuffers) {
                for (const buffer of lampBuffers) {
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
    async update(deltaTime) {
        if (!this.objectManager)
            return;
        /*** Computer update... ***/
        const computerInstance = await this.objectManager.getObject('computer');
        if (computerInstance && 'update' in computerInstance)
            computerInstance.update(deltaTime);
    }
    async get() {
        const renderers = [
            ...this.ground.getBlocks(),
            ...this.walls.getBlocks(),
        ];
        if (this.objectManager) {
            //Lamp
            const lampBuffers = await this.objectManager.setObjectBuffer('lamp');
            if (lampBuffers)
                renderers.push(...lampBuffers);
            //Computer
            const computerBuffers = await this.objectManager.setObjectBuffer('computer');
            if (computerBuffers)
                renderers.push(...computerBuffers);
        }
        return renderers;
    }
    async render() {
        //Ground
        this.ground = new Ground(this.device, this.loader);
        await this.ground.init();
        //Walls
        this.walls = new Walls(this.device, this.loader);
        await this.walls.init();
        //Lamp
        if (this.objectManager)
            await this.objectManager.createObject('lamp');
        //Computer
        if (this.objectManager)
            await this.objectManager.createObject('computer');
    }
}
