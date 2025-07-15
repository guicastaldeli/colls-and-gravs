import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { Walls } from "./walls.js";
import { Ground } from "./ground.js";
import { hasWire } from "./obj/object-manager.js";
export class EnvRenderer {
    device;
    loader;
    shaderLoader;
    windManager;
    //Items
    walls;
    ground;
    //Objects
    objectManager;
    lamp;
    constructor(device, loader, shaderLoader, windManager, objectManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.windManager = windManager;
        this.objectManager = objectManager;
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
        //Walls
        const walls = this.walls.getBlocks();
        for (let i = 0; i < walls.length; i++) {
            const data = walls[i];
            const num = 256;
            const offset = num * (i + 1);
            await this.drawObject(passEncoder, data, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
        }
        //
        //Lamp
        if (this.objectManager) {
            const lamp = await this.objectManager.getObject('lamp');
            if (lamp) {
                if (lamp && hasWire(lamp) && lamp.wire) {
                    lamp.wire.getBuffers();
                }
            }
            const lampBuffers = await this.objectManager.setObjectBuffer('lamp');
            if (lampBuffers) {
                const data = lampBuffers;
                const num = 256;
                const offset = num;
                await this.drawObject(passEncoder, data, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
            }
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
    async get() {
        const renderers = [
            ...this.ground.getBlocks(),
            ...this.walls.getBlocks(),
        ];
        if (this.objectManager) {
            const lampBuffers = await this.objectManager.setObjectBuffer('lamp');
            if (lampBuffers)
                renderers.push(lampBuffers);
        }
        return renderers;
    }
    async render(deltaTime, passEncoder, viewProjectionMatrix) {
        this.ground = new Ground(this.device, this.loader);
        await this.ground.init();
        this.walls = new Walls(this.device, this.loader);
        await this.walls.init();
        if (this.objectManager) {
            this.lamp = await this.objectManager.createObject('lamp');
            (await this.objectManager.getObject('lamp')).update(deltaTime, passEncoder, viewProjectionMatrix);
        }
    }
}
