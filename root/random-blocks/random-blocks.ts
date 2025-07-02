import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { BoxCollider, Collider, ICollidable } from "../collider.js";
import { Loader } from "../loader.js";
import { ResourceManager } from "./resource-manager.js";
import { PlayerController } from "../player-controller.js";
import { Hud } from "../hud.js";
import { ShaderLoader } from "../shader-loader.js";

import { OutlineConfig } from "./outline-config.js";

interface BlockData {
    id: string,
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
    private shaderLoader: ShaderLoader;

    public blocks: BlockData[] = [];
    private _Colliders: BoxCollider[] = [];
    private resourceManager: ResourceManager;
    private blockIdCounter: number = 0;
    public targetBlockIndex: number = -1;

    public sharedResources: Map<string, SharedResource> = new Map();
    private defaultSharedResourceId = 'default-m';

    private lastMouseClickTime: number = 0;
    private clickCooldown: number = 0;
    private keyPressed: boolean = false;

    private preloadModel: any;
    private preloadTex!: GPUTexture;

    public outline: OutlineConfig;

    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();

        this.outline = new OutlineConfig(device, shaderLoader);
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
            referenceCount: 1
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

    public async addBlock(position: vec3): Promise<BlockData> {
        try {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            mat4.scale(
                modelMatrix,
                modelMatrix,
                [0.1, 0.1, 0.1]
            )
    
            const collider = new BoxCollider(
                [1, 1, 1],
                [position[0], position[1], position[2]]
            );
    
            const sharedResource = this.addSharedResource(this.defaultSharedResourceId);
            if(!sharedResource) throw new Error('err');
    
            const newBlock = {
                id: `block-${this.blockIdCounter++}`,
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
            }
    
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            return newBlock;
        } catch(err) {
            console.log(err)
            throw err;
        }
    }

    public updateTargetBlock(playerController: PlayerController): void {
        this.targetBlockIndex = -1;

        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestDistance = Infinity;

        for(let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);

            if(intersection?.hit && intersection.distance !== undefined) {
                if(intersection.distance < maxDistance && intersection.distance < closestDistance) {
                    closestDistance = intersection.distance;
                    this.targetBlockIndex = i;
                }
            }
        }
    }

    private removeBlock(i: number): void {
        if(i < 0 || i >= this.blocks.length) return;

        if(i >= 0 && i < this.blocks.length) {
            const block = this.blocks[i];
            if(!block) return;
            
            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
            
            this.releaseSharedResource(block.sharedResourceId);
            const resouce = this.sharedResources.get(block.sharedResourceId);
            if(!resouce) this.resourceManager.waitCleanup();
        }
    }

    private removeBlockRaycaster(playerController: PlayerController): void {
        this.updateTargetBlock(playerController);
        if(this.targetBlockIndex >= 0) {
            const blockToRemove = this.blocks[this.targetBlockIndex];

            const blockCollidable = {
                getCollider: () => blockToRemove.collider,
                getPosition: () => blockToRemove.position,
                id: blockToRemove.id
            }

            playerController.removeCollidable(blockCollidable);
            this.removeBlock(this.targetBlockIndex);
        }
    }

    private async addBlocksRaycaster(
        playerController: PlayerController, 
        hud: Hud
    ): Promise<void> {
        const minDistance = 1.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();

        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
        const blockPos = vec3.create();

        blockPos[0] = Math.round(targetPos[0]);
        blockPos[1] = Math.round(targetPos[1]);
        blockPos[2] = Math.round(targetPos[2]);

        const positionOccupied = this.blocks.some(block =>
            block.position[0] === blockPos[0] &&
            block.position[1] === blockPos[1] &&
            block.position[2] === blockPos[2]
        );

        if(!positionOccupied) {
            await this.addBlock(blockPos);

            const newBlockCollidable = {
                getCollider: () => this.blocks[this.blocks.length - 1].collider,
                getPosition: () => this.blocks[this.blocks.length - 1].position,
                id: this.blocks[this.blocks.length - 1].id
            };

            playerController.addCollidable(newBlockCollidable);
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

    private async renderOutline(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        format: GPUTextureFormat,
    ): Promise<void> {
        this.outline.initOutline(canvas, device, format);
    }

    public async init(
        canvas: HTMLCanvasElement, 
        playerController: PlayerController,
        format: GPUTextureFormat,
        hud: Hud,
    ): Promise<void> {
        await this.renderOutline(canvas, this.device, format);
        this.initListeners(playerController, hud);
        this.updateTargetBlock(playerController);
    }
}