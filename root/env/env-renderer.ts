import { mat4 } from "../../node_modules/gl-matrix/esm/index.js";

import { EnvBufferData } from "./env-buffers.js";
import { PlayerController } from "../player/player-controller.js";
import { Loader } from "../loader.js";
import { ShaderLoader } from "../shader-loader.js";
import { WindManager } from "../wind-manager.js";

import { Walls } from "./walls.js";
import { Ground } from "./ground.js";
import { ObjectManager } from "./obj/object-manager.js";
import { Lamp } from "./obj/lamp/lamp.js";

export class EnvRenderer {
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;
    private windManager: WindManager;

    //Items
    public walls!: Walls;
    public ground!: Ground;

    //Objects
    public objectManager?: ObjectManager;
    private lamp!: number;

    constructor(
        device: GPUDevice, 
        loader: Loader,
        shaderLoader: ShaderLoader,
        windManager: WindManager,
        objectManager?: ObjectManager
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.windManager = windManager;
        this.objectManager = objectManager;
    }

    public async renderEnv(
        passEncoder: GPURenderPassEncoder,
        uniformBuffer: GPUBuffer,
        viewProjectionMatrix: mat4,
        bindGroup: GPUBindGroup
    ): Promise<void> {
        //Ground
            const blocks = this.ground.getBlocks();

            for(let i = 0; i < blocks.length; i++) {
                const data = blocks[i];
                const num = 256;
                const offset = num * (i + 1);

                await this.drawObject(
                    passEncoder, 
                    data, 
                    uniformBuffer, 
                    viewProjectionMatrix, 
                    bindGroup, 
                    offset
                );
            }
        //

        //Walls
            const walls = this.walls.getBlocks();

            for(let i = 0; i < walls.length; i++) {
                const data = walls[i];
                const num = 256;
                const offset = num * (i + 1);

                await this.drawObject(
                    passEncoder, 
                    data, 
                    uniformBuffer, 
                    viewProjectionMatrix, 
                    bindGroup, 
                    offset
                );
            }
        //

        //Lamp
            if(this.objectManager) {
                const lamp = this.objectManager.getObject<Lamp>(this.lamp)?.getBuffers();
    
                if(lamp) {
                    const data = lamp;
                    const num = 256;
                    const offset = num;
    
                    await this.drawObject(
                        passEncoder,
                        data,
                        uniformBuffer,
                        viewProjectionMatrix,
                        bindGroup,
                        offset
                    )
                }
            }
        //
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
        this.device.queue.writeBuffer(uniformBuffer, offset, mvpMatrix as ArrayBuffer);

        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.drawIndexed(buffers.indexCount);
    }

    public get(): EnvBufferData[] {
        const renderers = [
            ...this.ground.getBlocks(),
            ...this.walls.getBlocks(),
        ];

        if(this.objectManager) {
            const lampBuffers = this.objectManager.getObject<Lamp>(this.lamp)?.getBuffers();
            if(lampBuffers) renderers.push(lampBuffers);
        }

        return renderers;
    }

    public async render(): Promise<void> {
        this.ground = new Ground(this.device, this.loader);
        await this.ground.init();
        
        this.walls = new Walls(this.device, this.loader);
        await this.walls.init();

        if(this.objectManager) this.lamp = await this.objectManager.createObject('lamp');
    }
}