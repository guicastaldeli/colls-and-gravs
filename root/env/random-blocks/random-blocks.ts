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
import { Ground } from "../ground.js";

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
    private lastHitFace: number = 0;
    private lastHitPoint: vec3 = vec3.create();
    private isPlacingBlock: boolean = false;
    private eventListenersInitialized: boolean = false;

    public sharedResources: Map<string, SharedResource> = new Map();
    private defaultSharedResourceId = 'default-m';

    private preloadModel: any;
    private preloadTex!: GPUTexture;

    private gridSize = {
        x: 1.0,
        y: 1.0,
        z: 1.0
    }

    //Collision
        private _Colliders: BoxCollider[] = [];
        public type = 'block';

        private colliderScale = { 
            w: 8, 
            h: 10, 
            d: 10 
        }

        private positionAdjusted = { 
            x: 55, 
            y: 1.5, 
            z: 65 
        }
    //

    //Raycaster
    private raycaster: Raycaster;
    public outline: OutlineConfig;

    //Physics
    private physicsSystem: PhysicsSystem;
    private physicsObjects: Map<string, PhysicsObject> = new Map();
    private physicsGrid: PhysicsGrid;

    private ground: Ground;

    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    }

    constructor(
        tick: Tick,
        device: GPUDevice, 
        loader: Loader, 
        shaderLoader: ShaderLoader,
        ground: Ground
    ) {
        this.tick = tick;
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();

        this.raycaster = new Raycaster();
        this.outline = new OutlineConfig(device, shaderLoader);

        this.physicsSystem = new PhysicsSystem(ground);
        this.physicsGrid = new PhysicsGrid(2.0);

        this.ground = ground;
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
        try {
            if(this.isPositionOccupied(position)) throw new Error('err pos');

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

            //Collision
            const collider = new BoxCollider(
                [
                    this.size.w * this.colliderScale.w,
                    this.size.h * this.colliderScale.h,
                    this.size.d * this.colliderScale.d
                ],
                [
                    position[0] / this.positionAdjusted.x,
                    position[1] - this.positionAdjusted.y,
                    position[2] / this.positionAdjusted.z
                ]
            );

            //Physics
            const physicsObj = new PhysicsObject(
                vec3.clone(position),
                vec3.create(),
                vec3.create(),
                collider
            );

            physicsObj.isStatic = false;
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

        const halfWidth = this.size.w * 5;
        const halfHeight = this.size.h * 5;
        const halfDepth = this.size.d * 5

        for(let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            
            const min = [
                block.position[0] - halfWidth,
                block.position[1] - halfHeight,
                block.position[2] - halfDepth,
            ];

            const max = [
                block.position[0] + halfWidth,
                block.position[1] + halfHeight,
                block.position[2] + halfDepth,
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
                if(intersection.face !== undefined) {
                    closestDistance = intersection.distance;
                    this.targetBlockIndex = i;
                    this.lastHitFace = intersection.face;
                    this.lastHitPoint = vec3.create();
                    vec3.scaleAndAdd(
                        this.lastHitPoint,
                        rayOrigin,
                        rayDirection,
                        intersection.distance
                    );
                }
            }
        }
    }

    private removeBlock(i: number, playerController: PlayerController): void {
        if(i < 0 || i >= this.blocks.length) return;

        if(i >= 0 && i < this.blocks.length) {
            const block = this.blocks[i];
            if(!block) return;
            
            const physicsObj = this.physicsObjects.get(block.id);
            if(physicsObj) {
                this.physicsSystem.removePhysicsObject(physicsObj);
                this.physicsGrid.removeObject(physicsObj);
                this.physicsGrid.removeObjectFromCell(
                    this.physicsGrid.getCellKey(physicsObj.position),
                    physicsObj
                );
                
                this.physicsObjects.delete(block.id);
            }

            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
            
            this.releaseSharedResource(block.sharedResourceId);
            const resouce = this.sharedResources.get(block.sharedResourceId);
            if(!resouce) this.resourceManager.waitCleanup();

            this.updatePhysicsCollidables(playerController);
        }
    }

    private removeBlockRaycaster(playerController: PlayerController): void {
        this.updateTargetBlock(playerController);
        if(this.targetBlockIndex >= 0) {
            const blockToRemove = this.targetBlockIndex;
            this.removeBlock(blockToRemove, playerController);
        }
    }

    private async addBlocksRaycaster(
        playerController: PlayerController, 
        hud: Hud
    ): Promise<void> {
        if(this.isPlacingBlock) return;
        this.isPlacingBlock = true;

        try {
            const newPos = vec3.create();
            const minDistance = 2.0;
            const rayOrigin = playerController.getCameraPosition();
            const rayDirection = playerController.getForward();
            this.updateTargetBlock(playerController);
    
            if(this.targetBlockIndex >= 0) {
                const targetBlock = this.blocks[this.targetBlockIndex];
                const offset = this.size.w * 5;
    
                switch(this.lastHitFace) {
                    case 0:
                        vec3.set(newPos, 
                            targetBlock.position[0] + offset * 2, 
                            targetBlock.position[1], 
                            targetBlock.position[2]);
                        break;
                    case 1:
                        vec3.set(newPos, 
                            targetBlock.position[0] - offset, 
                            targetBlock.position[1], 
                            targetBlock.position[2]);
                        break;
                    case 2:
                        vec3.set(newPos, 
                            targetBlock.position[0], 
                            targetBlock.position[1] + offset * 2, 
                            targetBlock.position[2]);
                        break;
                    case 3:
                        vec3.set(newPos, 
                            targetBlock.position[0], 
                            targetBlock.position[1] - offset * 2, 
                            targetBlock.position[2]);
                        break;
                    case 4:
                        vec3.set(newPos, 
                            targetBlock.position[0], 
                            targetBlock.position[1], 
                            targetBlock.position[2] + offset * 2);
                        break;
                    case 5:
                        vec3.set(newPos, 
                            targetBlock.position[0], 
                            targetBlock.position[1], 
                            targetBlock.position[2] - offset * 2);
                        break;
                }

                newPos[0] = Math.abs(newPos[0] / this.gridSize.x) * this.gridSize.x;
                newPos[1] = Math.abs(newPos[1] / this.gridSize.y) * this.gridSize.y * 1.2;
                newPos[2] = Math.abs(newPos[2] / this.gridSize.z) * this.gridSize.z;
                if(!this.isPositionOccupied(newPos)) await this.addBlock(newPos, playerController);
            } else {
                const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
                if(!targetPos) throw new Error('err target');
        
                const newPos = vec3.create();
                newPos[0] = Math.abs(targetPos[0] / this.gridSize.x) * this.gridSize.x;
                newPos[1] = Math.abs(targetPos[1] / this.gridSize.y) * this.gridSize.y;
                newPos[2] = Math.abs(targetPos[2] / this.gridSize.z) * this.gridSize.z;
                if(!this.isPositionOccupied(newPos)) await this.addBlock(newPos, playerController)
            }
        } finally {
            this.isPlacingBlock = false;
        }
    }

    private isPositionOccupied(pos: vec3): boolean {
        const occupiedBlock = this.blocks.some(block => {
            return Math.abs(block.position[0] - pos[0]) < 0.01 &&
                    Math.abs(block.position[1] - pos[1]) < 0.01 &&
                    Math.abs(block.position[2] - pos[2]) < 0.01
        });

        const groundLevel = this.ground.getGroundLevelY(pos[0], pos[2]);
        const belowGround = pos[1] < groundLevel;
        return occupiedBlock || belowGround;
    }

    private initListeners(
        playerController: PlayerController,
        hud: Hud
    ): void {
        if(this.eventListenersInitialized) return;
        this.eventListenersInitialized = true;
        
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
        throw new Error('.')
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
                if(physicsObj.isStatic) {
                    physicsObj.position[0] = Math.abs(physicsObj.position[0] / this.gridSize.x) * this.gridSize.x;
                    physicsObj.position[1] = Math.abs(physicsObj.position[1] / this.gridSize.y) * this.gridSize.y;
                    physicsObj.position[2] = Math.abs(physicsObj.position[2] / this.gridSize.z) * this.gridSize.z;
                }

                const oldPosition = vec3.clone(physicsObj.position);

                if(physicsObj.position.some(isNaN)) {
                    console.error(physicsObj);
                    return;
                }

                const groundLevel = this.ground.getGroundLevelY(
                    physicsObj.position[0],
                    physicsObj.position[2]
                );

                const sizeY = this.size.h * this.colliderScale.h;
                const halfHeight = sizeY / 20;

                const halfSize = [
                    this.size.w * this.colliderScale.w / 2,
                    halfHeight,
                    this.size.d * this.colliderScale.d / 2
                ];

                const corners = [
                    vec3.fromValues(-halfSize[0], -halfSize[1], -halfSize[2]),
                    vec3.fromValues(-halfSize[0], -halfSize[1], halfSize[2]),
                    vec3.fromValues(halfSize[0], -halfSize[1], -halfSize[2]),
                    vec3.fromValues(halfSize[0], -halfSize[1], halfSize[2]) 
                ];

                let lowestPoint = Infinity;
                for(const corner of corners) {
                    const rotatedCorner = vec3.create();
                    vec3.transformQuat(rotatedCorner, corner, physicsObj.orientation);
                    const worldY = physicsObj.position[1] + rotatedCorner[1];
                    lowestPoint = Math.min(lowestPoint, worldY);
                }

                if(lowestPoint < groundLevel) {
                    const correction = groundLevel - lowestPoint;
                    physicsObj.position[1] += correction;
                    physicsObj.velocity[1] = 0;

                    vec3.scale(physicsObj.angularVelocity, physicsObj.angularVelocity, 0.9);
                    if(vec3.length(physicsObj.angularVelocity) < 0.01) vec3.set(physicsObj.angularVelocity, 0, 0, 0);
                }

                if(!vec3.equals(oldPosition, physicsObj.position)) this.physicsGrid.updateObjectPosition(oldPosition, physicsObj);
                vec3.copy(block.position, physicsObj.position);
                mat4.identity(block.modelMatrix);
                mat4.fromQuat(block.modelMatrix, physicsObj.orientation);
                mat4.translate(block.modelMatrix, block.modelMatrix, block.position);
                mat4.scale(
                    block.modelMatrix,
                    block.modelMatrix,
                    [this.size.w, this.size.h, this.size.d]
                );

                const colliderIndex = this.blocks.indexOf(block);
                if(colliderIndex >= 0 && colliderIndex < this._Colliders.length) {
                    this._Colliders[colliderIndex]._offset = [
                        block.position[0] / this.positionAdjusted.x,
                        block.position[1] - this.positionAdjusted.y,
                        block.position[2] / this.positionAdjusted.z
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