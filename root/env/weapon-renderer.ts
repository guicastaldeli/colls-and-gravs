import { mat3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";

import { EnvBufferData } from "./env-buffers.js";
import { PlayerController } from "../player/player-controller.js";
import { Loader } from "../loader.js";
import { ShaderLoader } from "../shader-loader.js";
import { ObjectManager } from "./obj/object-manager.js";

export class WeaponRenderer {
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;
    public objectManager?: ObjectManager;

    constructor(
        device: GPUDevice, 
        loader: Loader,
        shaderLoader: ShaderLoader,
        objectManager?: ObjectManager
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.objectManager = objectManager;
    }

    public async renderEnv(
        passEncoder: GPURenderPassEncoder,
        uniformBuffer: GPUBuffer,
        viewProjectionMatrix: mat4,
        bindGroup: GPUBindGroup
    ): Promise<void> {
        //Sword
        if(this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if(swordBuffers) {
                for(const buffer of swordBuffers) {
                    const num = 256;
                    const offset = num;
                    await this.drawObject(passEncoder, buffer, uniformBuffer, viewProjectionMatrix, bindGroup, offset);
                }
            }
        }
    }

    private async drawObject(
        passEncoder: GPURenderPassEncoder,
        buffers: EnvBufferData,
        uniformBuffer: GPUBuffer,
        viewProjectionMatrix: mat4,
        bindGroup: GPUBindGroup,
        offset: number
    ): Promise<void> {
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

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        if(this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if(swordBuffers) renderers.push(...swordBuffers);
        }

        return renderers;
    }

    public async render(deltaTime: number): Promise<void> {
        if(this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}