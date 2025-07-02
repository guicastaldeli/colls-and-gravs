import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { initBuffers } from "./random-blocks-buffer.js";
import { Loader } from "../loader.js";
import { BoxCollider, Collider, ICollidable } from "../collider.js";
import { PlayerController } from "../player-controller.js";
import { Hud } from "../hud.js";

interface BlockData {
    modelMatrix: mat4;
    position: vec3;
    collider: BoxCollider;
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    texture?: GPUTexture;
    sampler?: GPUSampler;
}

export class RandomBlocks {
    private device: GPUDevice;
    private loader: Loader;

    private blocks: BlockData[] = [];
    private _Colliders: BoxCollider[] = [];

    private lastMouseClickTime: number = 0;
    private clickCooldown: number = 0;
    private keyPressed: boolean = false;

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
    }

    public getBlocks(): BlockData[] {
        return this.blocks;
    }

    public getColliders(): ICollidable[] {
        return this.blocks.map(block => ({
            getCollider: () => block.collider,
            getPosition: () => block.position
        }));
    }

    public async addBlock(position: vec3): Promise<void> {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, position);

        const model = await this.loader.parser('./assets/env/obj/smile.obj');
        const texture = await this.loader.textureLoader('./assets/env/textures/smile.png');
        const sampler = this.loader.createSampler();

        const collider = new BoxCollider(
            [1, 1, 1],
            [position[0], position[1], position[2]]
        );

        const { 
            vertex, 
            color, 
            index, 
            indexCount 
        } = await initBuffers(this.device);

        this.blocks.push({
            modelMatrix,
            position: vec3.clone(position),
            collider,
            vertex: model.vertex,
            color: model.color,
            index: model.index,
            indexCount: model.indexCount,
            texture,
            sampler
        });

        this._Colliders.push(collider);
    }

    private removeBlock(i: number): void {
        if(i >= 0 && i < this.blocks.length) {
            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
        }
    }

    private removeBlockRaycaster(playerController: PlayerController, ): void {
        const maxDistance: number = 5
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();

        let closestBlock: { 
            i: number,
            distance: number,
        } | null = null;
        
        for(let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const toBlock = vec3.create();
            vec3.sub(toBlock, block.position, rayOrigin);
            
            const distance = vec3.length(toBlock);

            if(distance <= maxDistance) {
                const direction = vec3.clone(toBlock);
                vec3.normalize(direction, direction);
                const dot = vec3.dot(rayDirection, direction);

                if(dot < 0.98) {
                    if(!closestBlock || distance < closestBlock.distance) {
                        closestBlock = {
                            i,
                            distance
                        }
                    }
                }
            }
        }

        if(closestBlock) {
            const blockCollidable = {
                getCollider: () => this.blocks[this.blocks.length - 1].collider,
                getPosition: () => this.blocks[this.blocks.length - 1].position,
            }

            this.removeBlock(closestBlock.i);
            playerController.removeCollidable(blockCollidable);
        }
    }

    private async addBlocksRaycaster(
        playerController: PlayerController, 
        hud: Hud
    ): Promise<void> {
        const distance: number = 5
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, distance);

        const maxDistance = 10;
        const step = 0.1;
        let lastEmptyPos: vec3 | null = null;
        let currentDitance = 0;

        while(currentDitance <= maxDistance) {
            const checkPos = vec3.create();
            vec3.scaleAndAdd(checkPos, rayOrigin, rayDirection, currentDitance);

            const blockPos = vec3.create();
            blockPos[0] = Math.round(targetPos[0] + 2);
            blockPos[1] = Math.round(targetPos[1] - 1);
            blockPos[2] = Math.round(targetPos[2]);

            let positionOccupied = false;
            for(const block of this.blocks) {
                if(vec3.distance(blockPos, block.position) < 0.1) {
                    positionOccupied = true;
                    break;
                }
            }

            if(!positionOccupied) {
                await this.addBlock(blockPos);

                const newBlockCollidable = {
                    getCollider: () => this.blocks[this.blocks.length - 1].collider,
                    getPosition: () => this.blocks[this.blocks.length - 1].position,
                }

                playerController.addCollidable(newBlockCollidable);
                return;
            }

            currentDitance += step;
        }
        
        if(lastEmptyPos) {
            await this.addBlock(lastEmptyPos);

            const newBlockCollidable = {
                getCollider: () => this.blocks[this.blocks.length - 1].collider,
                getPosition: () => this.blocks[this.blocks.length - 1].position,
            }

            playerController.addCollidable(newBlockCollidable);
        }
    }

    private initListeners(
        canvas: HTMLCanvasElement, 
        playerController: PlayerController,
        hud: Hud
    ): void {
        const cameraPos = playerController.getCameraPosition();
        const cameraForward = playerController.getForward();

        document.addEventListener('click', async (e) => {
            const eKey = e.button;
            if(eKey === 0) await this.addBlocksRaycaster(playerController, hud);
            if(eKey === 2) this.removeBlockRaycaster(playerController);
        });

        canvas.addEventListener('click', (e) => {
            if(e.button === 2) {
                const now = performance.now();
                if(now - this.lastMouseClickTime < this.clickCooldown) return;
                this.lastMouseClickTime = now;

                let closestBlock: { 
                    i: number,
                    distance: number,
                    collidable: ICollidable
                } | null = null;

                for(let i = 0; i < this.blocks.length; i++) {
                    const block = this.blocks[i];
                    const distance = vec3.distance(cameraPos, block.position);

                    const direction = vec3.create();
                    vec3.subtract(direction, block.position, cameraPos);
                    vec3.normalize(direction, direction);

                    const dot = vec3.dot(cameraForward, direction);

                    if(dot > 0.98 && distance < 5) {
                        if(!closestBlock || distance < closestBlock.distance) {
                            const blockCollidable = {
                                getCollider: () => block.collider,
                                getPosition: () => block.position,
                            }

                            closestBlock = { 
                                i, 
                                distance, 
                                collidable: 
                                blockCollidable 
                            }
                        }
                    }
                }

                if(closestBlock) {
                    this.removeBlock(closestBlock.i);
                    playerController.removeCollidable(closestBlock.collidable);
                }
            }
        });
    }

    public init(
        canvas: HTMLCanvasElement, 
        playerController: PlayerController,
        hud: Hud
    ): void {
        this.initListeners(canvas, playerController, hud);
    }
}