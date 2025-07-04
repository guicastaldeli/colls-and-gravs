import { mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";

import { Tick } from "../../tick.js";
import { BoxCollider, Collider, ICollidable } from "../../collider.js";
import { Loader } from "../../loader.js";
import { ResourceManager } from "./resource-manager.js";
import { PlayerController } from "../../player-controller.js";
import { Hud } from "../../hud.js";
import { ShaderLoader } from "../../shader-loader.js";
import { Raycaster } from "./raycaster.js";
import { OutlineConfig } from "./outline-config.js";
import { PhysicsSystem } from "../../physics/physics-system.js";
import { PhysicsObject } from "../../physics/physics-object.js";
import { PhysicsGrid } from "../../physics/physics-grid.js";
import { GetColliders } from "../../get-colliders.js";

interface BlockData {
    id: string,
    modelMatrix: mat4;
    position: vec3;
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

export class RandomBlocks implements ICollidable {
    private tick: Tick;
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    public blocks: BlockData[] = [];
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

    //Collision
    private _Colliders: BoxCollider[] = [];
    public type = 'block';

    //Raycaster
    private raycaster: Raycaster;
    public outline: OutlineConfig;

    //Physics
    private physicsSystem: PhysicsSystem;
    private physicsObjects: Map<string, PhysicsObject> = new Map();
    private physicsGrid: PhysicsGrid;

    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    }

    constructor(
        tick: Tick,
        device: GPUDevice, 
        loader: Loader, 
        shaderLoader: ShaderLoader
    ) {
        this.tick = tick;
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();

        this.raycaster = new Raycaster();
        this.outline = new OutlineConfig(device, shaderLoader);

        this.physicsSystem = new PhysicsSystem();
        this.physicsGrid = new PhysicsGrid(2.0);
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

    public async addBlock(position: vec3, playerController: PlayerController): Promise<BlockData> {
        console.log("Adding block at position:", position); 
        try {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            mat4.scale(
                modelMatrix,
                modelMatrix,
                [this.size.w, this.size.h, this.size.d]
            );

            const sharedResource = this.addSharedResource(this.defaultSharedResourceId);
            if(!sharedResource) throw new Error('err');
    
            const newBlock = {
                id: `block-${this.blockIdCounter++}`,
                modelMatrix,
                position: vec3.clone(position),
                vertex: sharedResource.vertex,
                color: sharedResource.color,
                index: sharedResource.index,
                indexCount: sharedResource.indexCount,
                texture: sharedResource.texture,
                sampler: sharedResource.sampler,
                sharedResourceId: this.defaultSharedResourceId
            }

            console.log("New block created:", newBlock);

            //Collision
            const collider = new BoxCollider(
                [this.size.w * 8, this.size.h * 10, this.size.d * 10],
                [position[0] / 55, position[1] - 1.5, position[2] / 65]
            );

            //Physics
            const physicsObj = new PhysicsObject(
                vec3.clone(position),
                collider
            );
            physicsObj.isStatic = false;
            physicsObj.mass = 1.0;
            physicsObj.restitution = 0.5
            console.log("Physics object created:", physicsObj);
            console.log("Physics object position:", physicsObj.position);

            this.physicsObjects.set(newBlock.id, physicsObj);
            this.physicsSystem.addPhysicsObject(physicsObj);
            this.physicsGrid.addObject(physicsObj);
    
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            playerController.updateCollidables();

            this.updatePhysicsCollidables(playerController);

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
            
            const min = [
                block.position[0] - this.size.w * 5,
                block.position[1] - this.size.h * 5,
                block.position[2] - this.size.d * 5,
            ];

            const max = [
                block.position[0] + this.size.w * 5,
                block.position[1] + this.size.h * 5,
                block.position[2] + this.size.d * 5,
            ];

            const intersection = this.raycaster.rayAABBIntersect(
                rayOrigin,
                rayDirection,
                min,
                max
            );

            if(intersection.hit &&
                intersection.distance !== undefined &&
                intersection.distance < maxDistance &&
                intersection.distance < closestDistance
            ) {
                closestDistance = intersection.distance;
                this.targetBlockIndex = i;
            }
        }
    }

    private removeBlock(i: number): void {
        if(i < 0 || i >= this.blocks.length) return;

        if(i >= 0 && i < this.blocks.length) {
            const block = this.blocks[i];
            if(!block) return;
            
            this.physicsObjects.delete(block.id);
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
            const blockToRemove = this.targetBlockIndex;
            this.removeBlock(blockToRemove);
        }
    }

    private async addBlocksRaycaster(
        playerController: PlayerController, 
        hud: Hud
    ): Promise<void> {
        const minDistance = 2.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();

        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
        const blockPos = vec3.create();

        blockPos[0] = Math.round(targetPos[0] / this.size.w) * this.size.w;
        blockPos[1] = Math.round(targetPos[1] / this.size.h) * this.size.h;
        blockPos[2] = Math.round(targetPos[2] / this.size.d) * this.size.d;

        const positionOccupied = this.blocks.some(block =>
            Math.abs(block.position[0] - blockPos[0]) < this.size.w &&
            Math.abs(block.position[1] - blockPos[1]) < this.size.h &&
            Math.abs(block.position[2] - blockPos[2]) < this.size.d
        );

        if(!positionOccupied) await this.addBlock(blockPos, playerController);
    }

    private initListeners(
        playerController: PlayerController,
        hud: Hud
    ): void {
        document.addEventListener('click', async (e) => {
            const eKey = e.button;

            if(!this.tick.isPaused) {
                if(eKey === 0) await this.addBlocksRaycaster(playerController, hud);
                if(eKey === 2) this.removeBlockRaycaster(playerController);
            }
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

    public getBlocks(): BlockData[] {
        return this.blocks;
    }

    public getPosition(): vec3 {
        return vec3.fromValues(0, 0, 0);
    }

    public getCollider(): Collider {
        throw new Error('hiuf')
    }

    public getAllColliders(): {
        collider: Collider,
        position: vec3,
        type: string
    }[] {
        return this._Colliders.map((collider, i) => ({
            collider,
            position: vec3.clone(this.blocks[i].position),
            type: this.type
        }));
    }

    public updatePhysicsCollidables(playerController: PlayerController): void {
        const getColliders = new GetColliders(undefined, this);
        this.physicsSystem.setCollidables(getColliders.getCollidables());
        playerController.updateCollidables();
    }

    public update(deltaTime: number): void {
        this.physicsSystem.update(deltaTime);

        for(const block of this.blocks) {
            const physicsObj = this.physicsObjects.get(block.id);

            if(physicsObj && !physicsObj.isStatic) {
                vec3.copy(block.position, physicsObj.position);

                mat4.identity(block.modelMatrix);
                mat4.translate(block.modelMatrix, block.modelMatrix, block.position);
                mat4.scale(
                    block.modelMatrix,
                    block.modelMatrix,
                    [this.size.w, this.size.h, this.size.d]
                );

                const colliderIndex = this.blocks.indexOf(block);
                if(colliderIndex >= 0 && colliderIndex < this._Colliders.length) {
                    this._Colliders[colliderIndex]._offset = [
                        block.position[0] / 55,
                        block.position[1] - 1.5,
                        block.position[2] / 65
                    ];
                }
            }
        }
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