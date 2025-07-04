import { mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../../collider.js";
import { ResourceManager } from "./resource-manager.js";
import { Raycaster } from "./raycaster.js";
import { OutlineConfig } from "./outline-config.js";
import { PhysicsSystem } from "../../physics/physics-system.js";
import { PhysicsObject } from "../../physics/physics-object.js";
import { PhysicsGrid } from "../../physics/physics-grid.js";
import { GetColliders } from "../../get-colliders.js";
export class RandomBlocks {
    tick;
    device;
    loader;
    shaderLoader;
    blocks = [];
    resourceManager;
    blockIdCounter = 0;
    targetBlockIndex = -1;
    sharedResources = new Map();
    defaultSharedResourceId = 'default-m';
    lastMouseClickTime = 0;
    clickCooldown = 0;
    keyPressed = false;
    preloadModel;
    preloadTex;
    //Collision
    _Colliders = [];
    type = 'block';
    colliderScale = {
        w: 8,
        h: 10,
        d: 10
    };
    positionAdjusted = {
        x: 55,
        y: 1.5,
        z: 65
    };
    //
    //Raycaster
    raycaster;
    outline;
    //Physics
    physicsSystem;
    physicsObjects = new Map();
    physicsGrid;
    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    };
    constructor(tick, device, loader, shaderLoader) {
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
    async preloadAssets() {
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
    addSharedResource(id) {
        const resource = this.sharedResources.get(id);
        if (resource) {
            resource.referenceCount++;
            return resource;
        }
        return null;
    }
    releaseSharedResource(id) {
        const resource = this.sharedResources.get(id);
        if (!resource)
            return;
        if (resource)
            resource.referenceCount--;
        if (resource.referenceCount <= 0) {
            this.resourceManager.scheduleDestroy(resource.vertex);
            this.resourceManager.scheduleDestroy(resource.color);
            this.resourceManager.scheduleDestroy(resource.index);
            this.resourceManager.scheduleDestroy(resource.texture);
            this.sharedResources.delete(id);
        }
    }
    async addBlock(position, playerController) {
        try {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            mat4.scale(modelMatrix, modelMatrix, [this.size.w, this.size.h, this.size.d]);
            const sharedResource = this.addSharedResource(this.defaultSharedResourceId);
            if (!sharedResource)
                throw new Error('err');
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
            };
            //Collision
            const collider = new BoxCollider([
                this.size.w * this.colliderScale.w,
                this.size.h * this.colliderScale.h,
                this.size.d * this.colliderScale.d
            ], [
                position[0] / this.positionAdjusted.x,
                position[1] - this.positionAdjusted.y,
                position[2] / this.positionAdjusted.z
            ]);
            //Physics
            const physicsObj = new PhysicsObject(vec3.clone(position), collider);
            physicsObj.isStatic = false; //off on
            vec3.set(physicsObj.velocity, 0, 0, 0);
            this.physicsObjects.set(newBlock.id, physicsObj);
            this.physicsSystem.addPhysicsObject(physicsObj);
            this.physicsGrid.addObject(physicsObj);
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            playerController.updateCollidables();
            this.updatePhysicsCollidables(playerController);
            return newBlock;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    updateTargetBlock(playerController) {
        this.targetBlockIndex = -1;
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestDistance = Infinity;
        for (let i = 0; i < this.blocks.length; i++) {
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
            const intersection = this.raycaster.rayAABBIntersect(rayOrigin, rayDirection, min, max);
            if (intersection.hit &&
                intersection.distance !== undefined &&
                intersection.distance < maxDistance &&
                intersection.distance < closestDistance) {
                closestDistance = intersection.distance;
                this.targetBlockIndex = i;
            }
        }
    }
    removeBlock(i, playerController) {
        if (i < 0 || i >= this.blocks.length)
            return;
        if (i >= 0 && i < this.blocks.length) {
            const block = this.blocks[i];
            if (!block)
                return;
            const physicsObj = this.physicsObjects.get(block.id);
            if (physicsObj) {
                this.physicsSystem.removePhysicsObject(physicsObj);
                this.physicsGrid.removeObject(physicsObj);
            }
            this.physicsObjects.delete(block.id);
            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
            this.releaseSharedResource(block.sharedResourceId);
            const resouce = this.sharedResources.get(block.sharedResourceId);
            if (!resouce)
                this.resourceManager.waitCleanup();
            this.updatePhysicsCollidables(playerController);
        }
    }
    removeBlockRaycaster(playerController) {
        this.updateTargetBlock(playerController);
        if (this.targetBlockIndex >= 0) {
            const blockToRemove = this.targetBlockIndex;
            this.removeBlock(blockToRemove, playerController);
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        const minDistance = 2.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
        const blockPos = vec3.create();
        if (!targetPos || targetPos.some(isNaN)) {
            console.error('Invalid target');
            return;
        }
        blockPos[0] = Math.round(targetPos[0] / this.size.w) * this.size.w;
        blockPos[1] = Math.round(targetPos[1] / this.size.h) * this.size.h;
        blockPos[2] = Math.round(targetPos[2] / this.size.d) * this.size.d;
        const positionOccupied = this.blocks.some(block => Math.abs(block.position[0] - blockPos[0]) < this.size.w &&
            Math.abs(block.position[1] - blockPos[1]) < this.size.h &&
            Math.abs(block.position[2] - blockPos[2]) < this.size.d);
        if (!positionOccupied)
            await this.addBlock(blockPos, playerController);
    }
    initListeners(playerController, hud) {
        document.addEventListener('click', async (e) => {
            const eKey = e.button;
            if (!this.tick.isPaused) {
                if (eKey === 0)
                    await this.addBlocksRaycaster(playerController, hud);
                if (eKey === 2)
                    this.removeBlockRaycaster(playerController);
            }
        });
    }
    async cleanupResources() {
        for (const [id, resource] of this.sharedResources) {
            this.resourceManager.scheduleDestroy(resource.vertex);
            this.resourceManager.scheduleDestroy(resource.color);
            this.resourceManager.scheduleDestroy(resource.index);
            this.resourceManager.scheduleDestroy(resource.texture);
        }
        this.sharedResources.clear();
        await this.resourceManager.cleanup();
    }
    async renderOutline(canvas, device, format) {
        this.outline.initOutline(canvas, device, format);
    }
    getBlocks() {
        return this.blocks;
    }
    getPosition() {
        return vec3.fromValues(0, 0, 0);
    }
    getCollider() {
        throw new Error('hiuf');
    }
    getAllColliders() {
        return this._Colliders.map((collider, i) => ({
            collider,
            position: vec3.clone(this.blocks[i].position),
            type: this.type
        }));
    }
    updatePhysicsCollidables(playerController) {
        const getColliders = new GetColliders(undefined, this);
        this.physicsSystem.setCollidables(getColliders.getCollidables());
        playerController.updateCollidables();
    }
    update(deltaTime) {
        this.physicsSystem.update(deltaTime);
        for (const block of this.blocks) {
            const physicsObj = this.physicsObjects.get(block.id);
            if (physicsObj && !physicsObj.isStatic) {
                if (physicsObj.position.some(isNaN)) {
                    console.error('Invalid object position', physicsObj);
                    continue;
                }
                vec3.copy(block.position, physicsObj.position);
                mat4.identity(block.modelMatrix);
                mat4.translate(block.modelMatrix, block.modelMatrix, block.position);
                mat4.scale(block.modelMatrix, block.modelMatrix, [this.size.w, this.size.h, this.size.d]);
                const colliderIndex = this.blocks.indexOf(block);
                if (colliderIndex >= 0 && colliderIndex < this._Colliders.length) {
                    this._Colliders[colliderIndex]._offset = [
                        block.position[0],
                        block.position[1],
                        block.position[2]
                    ];
                }
            }
        }
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            const physicsObj = this.physicsObjects.get(block.id);
            if (physicsObj && (physicsObj.position.some(isNaN) || physicsObj.velocity.some(isNaN))) {
                console.error('Removing Invalid block', block.id);
            }
        }
    }
    async init(canvas, playerController, format, hud) {
        await this.renderOutline(canvas, this.device, format);
        this.initListeners(playerController, hud);
        this.updateTargetBlock(playerController);
    }
}
