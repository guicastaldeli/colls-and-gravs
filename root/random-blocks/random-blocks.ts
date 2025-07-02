import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { initBuffers } from "./random-blocks-buffer.js";
import { BoxCollider, Collider, ICollidable } from "../collider.js";
import { Loader } from "../loader.js";
import { ResourceManager } from "./resource-manager.js";
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
    sharedResourceId: string;
}

interface SharedResource {
    vertex: GPUBuffer,
    color: GPUBuffer,
    index: GPUBuffer,
    indexCount: number,
    texture: GPUTexture,
    sampler: GPUSampler,
    referenceCount: number
}

export class RandomBlocks {
    private device: GPUDevice;
    private loader: Loader;

    private blocks: BlockData[] = [];
    private _Colliders: BoxCollider[] = [];
    private resourceManager: ResourceManager;

    private sharedResources: Map<string, SharedResource> = new Map();
    private defaultSharedResourceId = 'default-m';

    private lastMouseClickTime: number = 0;
    private clickCooldown: number = 0;
    private keyPressed: boolean = false;

    private preloadModel: any;
    private preloadTex!: GPUTexture;

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets()
    }

    public async preloadAssets(): Promise<void> {
        this.preloadModel = await this.loader.parser('./assets/env/obj/smile.obj');
        this.preloadTex = await this.loader.textureLoader('./assets/env/textures/smile.png');

        this.sharedResources.set(this.defaultSharedResourceId, {
            vertex: this.preloadModel.vertex,
            color: this.preloadModel.color,
            index: this.preloadModel.index,
            indexCount: this.preloadModel.indexCount,
            texture: this.preloadTex,
            sampler: this.loader.createSampler(),
            referenceCount: 0
        });
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

    private addSharedResource(id: string): SharedResource | null {
        const resource = this.sharedResources.get(id);
        if(resource) {
            resource.referenceCount++;
            return resource;
        }
        return null;
    }

    private releaseSharedResource(id: string): void {
        const resource = this.sharedResources.get(id);
        if(!resource) return;
        if(resource) resource.referenceCount--;

        if(resource.referenceCount <= 0) {
            this.resourceManager.scheduleDestroy(resource.vertex);
            this.resourceManager.scheduleDestroy(resource.color);
            this.resourceManager.scheduleDestroy(resource.index);
            this.resourceManager.scheduleDestroy(resource.texture);
            this.sharedResources.delete(id);
        }
    }

    public async addBlock(position: vec3): Promise<void> {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, position);

        const collider = new BoxCollider(
            [1, 1, 1],
            [position[0], position[1], position[2]]
        );

        const sharedResource = this.addSharedResource(this.defaultSharedResourceId);
        if(!sharedResource) return;

        this.blocks.push({
            modelMatrix,
            position: vec3.clone(position),
            collider,
            vertex: sharedResource.vertex,
            color: sharedResource.color,
            index: sharedResource.index,
            indexCount: sharedResource.indexCount,
            texture: sharedResource.texture,
            sampler: sharedResource.sampler,
            sharedResourceId: this.defaultSharedResourceId
        });

        this._Colliders.push(collider);
    }

    private async removeBlock(i: number): Promise<void> {
        try {
            if(i >= 0 && i < this.blocks.length) {
                const block = this.blocks[i];
                this.releaseSharedResource(block.sharedResourceId);

                this.blocks.splice(i, 1);
                this._Colliders.splice(i, 1);

                const resouce = this.sharedResources.get(block.sharedResourceId);
                if(!resouce) await this.resourceManager.waitCleanup();
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private removeBlockRaycaster(playerController: PlayerController, ): void {
        const maxDistance: number = 5;
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

                if(dot > 0.0995) {
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
            const block = this.blocks[closestBlock.i];

            const blockCollidable = {
                getCollider: () => block.collider,
                getPosition: () => block.position,
            }

            this.removeBlock(closestBlock.i).then(() => {
                playerController.removeCollidable(blockCollidable);
            });
        }
    }

    private async addBlocksRaycaster(
        playerController: PlayerController, 
        hud: Hud
    ): Promise<void> {
        const minDistance = 1.0;
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();

        let closestIntersection: {
            blockIndex: number,
            distance: number,
            faceNormal: vec3,
            intercetionPoint: vec3
        } | null = null;

        for(let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);

            if(intersection?.hit && 
                intersection.distance !== undefined &&
                intersection.distance >= minDistance &&
                intersection.distance <= maxDistance &&
                (!closestIntersection || intersection.distance < closestIntersection.distance))
            {
                closestIntersection = {
                    blockIndex: i,
                    distance: intersection.distance,
                    faceNormal: intersection.faceNormal,
                    intercetionPoint: intersection.point
                }
            }
        }

        if(closestIntersection) {
            const placementOffset = vec3.create();
            vec3.scale(placementOffset, closestIntersection.faceNormal, 1.0);
            const placementPos = vec3.create();
            vec3.add(placementPos, closestIntersection.intercetionPoint, placementOffset);

            placementPos[0] = Math.abs(placementPos[0]);
            placementPos[1] = Math.abs(placementPos[1]);
            placementPos[2] = Math.abs(placementPos[2]);

            const positionOccupied = this.blocks.some(block =>
                block.position[0] === placementPos[0] &&
                block.position[1] === placementPos[1] &&
                block.position[2] === placementPos[2]
            );

            if(!positionOccupied) {
                await this.addBlock(placementPos);

                const newBlockCollidable = {
                    getCollider: () => this.blocks[this.blocks.length - 1].collider,
                    getPosition: () => this.blocks[this.blocks.length - 1].position
                };

                playerController.addCollidable(newBlockCollidable);
            }
        } else {
            const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
            const blockPos = vec3.create();
            blockPos[0] = Math.abs(targetPos[0]);
            blockPos[1] = Math.abs(targetPos[1] - 0.5);
            blockPos[2] = Math.abs(targetPos[2]);

            const positionOccupied = this.blocks.some(block =>
                block.position[0] === blockPos[0] &&
                block.position[1] === blockPos[1] &&
                block.position[2] === blockPos[2]
            );

            if(!positionOccupied) {
                await this.addBlock(blockPos);

                const newBlockCollidable = {
                    getCollider: () => this.blocks[this.blocks.length - 1].collider,
                    getPosition: () => this.blocks[this.blocks.length - 1].position
                };

                playerController.addCollidable(newBlockCollidable);
            }
        }
    }

    private initListeners(
        playerController: PlayerController,
        hud: Hud
    ): void {
        document.addEventListener('click', async (e) => {
            const eKey = e.button;
            if(eKey === 0) await this.addBlocksRaycaster(playerController, hud);
            if(eKey === 2) this.removeBlockRaycaster(playerController);
        });
    }

    public async cleanupResources(): Promise<void> {
        for(const [id, resource] of this.sharedResources) {
            this.resourceManager.scheduleDestroy(resource.vertex);
            this.resourceManager.scheduleDestroy(resource.color);
            this.resourceManager.scheduleDestroy(resource.index);
            this.resourceManager.scheduleDestroy(resource.texture);
        }

        this.sharedResources.clear();
        await this.resourceManager.cleanup();
    }

    public init(
        canvas: HTMLCanvasElement, 
        playerController: PlayerController,
        hud: Hud
    ): void {
        this.initListeners(playerController, hud);
    }
}