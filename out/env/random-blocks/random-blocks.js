import { mat3, mat4, vec3, quat } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../../collision/collider.js";
import { GetColliders } from "../../collision/get-colliders.js";
import { ResourceManager } from "./resource-manager.js";
import { Raycaster } from "./raycaster.js";
import { OutlineConfig } from "./outline-config.js";
import { PhysicsSystem } from "../../physics/physics-system.js";
import { PhysicsObject } from "../../physics/physics-object.js";
import { PhysicsGrid } from "../../physics/physics-grid.js";
import { ListData, getRandomItem } from "./list.js";
import { PointLight } from "../../lightning/point-light.js";
export class RandomBlocks {
    tick;
    device;
    loader;
    shaderLoader;
    blocks = [];
    resourceManager;
    blockIdCounter = 0;
    targetBlockIndex = -1;
    lastHitFace = 0;
    lastHitPoint = vec3.create();
    isPlacingBlock = false;
    eventListenersInitialized = false;
    sharedResources = new Map();
    defaultSharedResourceId = 'default-m';
    blockLights = new Map();
    lightningManager;
    //Model
    currentItem;
    gridSize = {
        x: 1.0,
        y: 1.0,
        z: 1.0
    };
    //Collision
    _Colliders = [];
    type = 'block';
    positionAdjusted = {
        x: 70,
        y: 1.5,
        z: 70
    };
    //
    //Raycaster
    raycaster;
    outline;
    //Physics
    physicsSystem;
    physicsObjects = new Map();
    physicsGrid;
    ground;
    constructor(tick, device, loader, shaderLoader, ground, lightningManager) {
        this.tick = tick;
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();
        this.currentItem = getRandomItem();
        this.raycaster = new Raycaster();
        this.updateRaycasterCollider();
        this.outline = new OutlineConfig(device, shaderLoader);
        this.physicsSystem = new PhysicsSystem(ground);
        this.physicsGrid = new PhysicsGrid(2.0);
        this.ground = ground;
        this.lightningManager = lightningManager;
    }
    async preloadAssets() {
        for (const item of ListData) {
            try {
                const model = await this.loader.parser(item.modelPath);
                const tex = await this.loader.textureLoader(item.texPath);
                this.sharedResources.set(item.id, {
                    vertex: model.vertex,
                    color: model.color,
                    index: model.index,
                    indexCount: model.indexCount,
                    texture: tex,
                    sampler: this.loader.createSampler(),
                    referenceCount: 1
                });
            }
            catch (err) {
                throw new Error('err');
            }
        }
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
    async addBlock(position, playerController, faceNormal) {
        try {
            if (this.isPositionOccupied(position))
                throw new Error('err pos');
            this.currentItem = getRandomItem();
            const itemId = this.currentItem.id.toString();
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            mat4.scale(modelMatrix, modelMatrix, [
                this.currentItem.size.w,
                this.currentItem.size.h,
                this.currentItem.size.d
            ]);
            const sharedResource = this.addSharedResource(itemId);
            if (!this.sharedResources.has(itemId))
                throw new Error(`${itemId} not loaded`);
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
                sharedResourceId: this.defaultSharedResourceId,
                modelDef: this.currentItem
            };
            const initialOrientaton = quat.create();
            if (faceNormal) {
                const up = vec3.fromValues(0, 1, 0);
                const rotationAxis = vec3.cross(vec3.create(), up, faceNormal);
                const angle = Math.acos(vec3.dot(up, faceNormal));
                quat.setAxisAngle(initialOrientaton, rotationAxis, angle);
            }
            //Collision
            const collider = new BoxCollider([
                this.currentItem.size.w * this.currentItem.colliderScale.w,
                this.currentItem.size.h * this.currentItem.colliderScale.h,
                this.currentItem.size.d * this.currentItem.colliderScale.d
            ], [
                position[0] / this.positionAdjusted.x,
                position[1] - this.positionAdjusted.y,
                position[2] / this.positionAdjusted.z
            ]);
            //Physics
            const physicsObj = new PhysicsObject(vec3.clone(position), vec3.create(), vec3.create(), collider);
            physicsObj.isStatic = false;
            physicsObj.orientation = quat.clone(initialOrientaton);
            this.physicsObjects.set(newBlock.id, physicsObj);
            this.physicsSystem.addPhysicsObject(physicsObj);
            this.physicsGrid.addObject(physicsObj);
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            playerController.updateCollidables();
            this.updatePhysicsCollidables(playerController);
            const groundLevel = this.ground.getGroundLevelY(position[0], position[2]);
            if (position[1] < groundLevel + this.currentItem.size.h)
                position[1] = groundLevel + this.currentItem.size.h;
            const lightColor = vec3.fromValues(Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5);
            const light = new PointLight(vec3.clone(position), lightColor, 1.0, 3.0);
            this.blockLights.set(newBlock.id, light);
            this.lightningManager.addPointLight(newBlock.id, light);
            this.lightningManager.updatePointLightBuffer();
            return newBlock;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    updateRaycasterCollider() {
        const size = this.currentItem.size;
        this.raycaster.setCollider(new BoxCollider([
            size.w,
            size.h,
            size.d
        ], [0, 0, 0]));
    }
    updateTargetBlock(playerController) {
        this.targetBlockIndex = -1;
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestDistance = Infinity;
        let width, height, depth;
        if (this.currentItem.needsUpdate) {
            width = this.currentItem.updScale.w;
            height = this.currentItem.updScale.h;
            depth = this.currentItem.updScale.d;
        }
        else {
            width = this.currentItem.size.w;
            height = this.currentItem.size.h;
            depth = this.currentItem.size.d;
        }
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const physicsObj = this.physicsObjects.get(block.id);
            const halfSize = vec3.scale(vec3.create(), [
                width,
                height,
                depth,
            ], 1.0);
            const intersection = this.raycaster.getRayOBBIntersect(rayOrigin, rayDirection, physicsObj?.position, halfSize, physicsObj?.orientation);
            if (intersection.hit &&
                intersection.distance !== undefined &&
                intersection.distance < maxDistance &&
                intersection.distance < closestDistance) {
                if (intersection.face !== undefined) {
                    closestDistance = intersection.distance;
                    this.targetBlockIndex = i;
                    this.lastHitFace = intersection.face;
                    this.lastHitPoint = vec3.create();
                    vec3.scaleAndAdd(this.lastHitPoint, rayOrigin, rayDirection, intersection.distance);
                }
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
            if (!physicsObj)
                return;
            const supportedBlocks = this.getSupportingBlocks(physicsObj);
            supportedBlocks.forEach(b => this.makeFall(b));
            this.physicsSystem.removePhysicsObject(physicsObj);
            this.physicsGrid.removeObject(physicsObj);
            this.physicsGrid.removeObjectFromCell(this.physicsGrid.getCellKey(physicsObj.position), physicsObj);
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
    getSupportingBlocks(obj) {
        const supportingBlocks = [];
        const objBBox = obj.getCollider().getBoundingBox(obj.position);
        const objTop = objBBox.max[1];
        for (const [_, other] of this.physicsObjects) {
            const otherBBox = other.getCollider().getBoundingBox(other.position);
            const otherBottom = otherBBox.min[1];
            if (Math.abs(otherBottom - objTop) < 0.1) {
                const overlapX = Math.min(objBBox.max[0], otherBBox.max[0]) -
                    Math.max(objBBox.min[0], otherBBox.min[0]);
                const overlapZ = Math.min(objBBox.max[2], otherBBox.max[2]) -
                    Math.max(objBBox.min[2], otherBBox.min[2]);
                if (overlapX > 0.01 && overlapZ > 0.01)
                    supportingBlocks.push(other);
            }
        }
        return supportingBlocks;
    }
    makeFall(obj) {
        obj.isStatic = false;
        obj.isStable = false;
        obj.isSleeping = false;
        obj.velocity[1] = -5.5;
        const mass = obj.mass;
        const size = obj.getCollider().getSize();
        const w2 = size[0] * size[0];
        const h2 = size[1] * size[1];
        const d2 = size[2] * size[2];
        obj.lastUnstableTime = performance.now();
        mat3.set(obj.inertiaTensor, mass * (h2 + d2) / 12, 0, 0, 0, mass * (w2 + d2) / 12, 0, 0, 0, mass * (w2 + h2) / 12);
    }
    removeBlockRaycaster(playerController) {
        this.updateTargetBlock(playerController);
        if (this.targetBlockIndex >= 0) {
            const blockToRemove = this.targetBlockIndex;
            this.removeBlock(blockToRemove, playerController);
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        if (this.isPlacingBlock)
            return;
        this.isPlacingBlock = true;
        try {
            const newPos = vec3.create();
            const minDistance = 2.0;
            const rayOrigin = playerController.getCameraPosition();
            const rayDirection = playerController.getForward();
            this.updateTargetBlock(playerController);
            if (this.targetBlockIndex >= 0) {
                const targetBlock = this.blocks[this.targetBlockIndex];
                const offset = this.currentItem.size.w * 5;
                const faceNormal = this.getFaceNormal(this.lastHitFace);
                switch (this.lastHitFace) {
                    case 0:
                        vec3.set(newPos, targetBlock.position[0] + offset * 2, targetBlock.position[1], targetBlock.position[2]);
                        break;
                    case 1:
                        vec3.set(newPos, targetBlock.position[0] - offset, targetBlock.position[1], targetBlock.position[2]);
                        break;
                    case 2:
                        vec3.set(newPos, targetBlock.position[0], targetBlock.position[1] + offset * 2, targetBlock.position[2]);
                        break;
                    case 3:
                        vec3.set(newPos, targetBlock.position[0], targetBlock.position[1] - offset * 2, targetBlock.position[2]);
                        break;
                    case 4:
                        vec3.set(newPos, targetBlock.position[0], targetBlock.position[1], targetBlock.position[2] + offset * 2);
                        break;
                    case 5:
                        vec3.set(newPos, targetBlock.position[0], targetBlock.position[1], targetBlock.position[2] - offset * 2);
                        break;
                }
                newPos[0] = Math.abs(newPos[0] / this.gridSize.x) * this.gridSize.x;
                newPos[1] = Math.abs(newPos[1] / this.gridSize.y) * this.gridSize.y;
                newPos[2] = Math.abs(newPos[2] / this.gridSize.z) * this.gridSize.z;
                if (!this.isPositionOccupied(newPos))
                    await this.addBlock(newPos, playerController, faceNormal);
            }
            else {
                const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
                if (!targetPos)
                    throw new Error('err target');
                const newPos = vec3.create();
                newPos[0] = Math.abs(targetPos[0] / this.gridSize.x) * this.gridSize.x;
                newPos[1] = Math.abs(targetPos[1] / this.gridSize.y) * this.gridSize.y;
                newPos[2] = Math.abs(targetPos[2] / this.gridSize.z) * this.gridSize.z;
                if (!this.isPositionOccupied(newPos))
                    await this.addBlock(newPos, playerController);
            }
        }
        finally {
            this.isPlacingBlock = false;
        }
    }
    getFaceNormal(i) {
        switch (i) {
            case 0: return vec3.fromValues(1, 0, 0);
            case 1: return vec3.fromValues(-1, 0, 0);
            case 2: return vec3.fromValues(0, 1, 0);
            case 3: return vec3.fromValues(0, -1, 0);
            case 4: return vec3.fromValues(0, 0, 1);
            case 5: return vec3.fromValues(0, 0, -1);
            default: return vec3.fromValues(0, 1, 0);
        }
    }
    isPositionOccupied(pos) {
        const occupiedBlock = this.blocks.some(block => {
            return Math.abs(block.position[0] - pos[0]) < 0.01 &&
                Math.abs(block.position[1] - pos[1]) < 0.01 &&
                Math.abs(block.position[2] - pos[2]) < 0.01;
        });
        const groundLevel = this.ground.getGroundLevelY(pos[0], pos[2]);
        const belowGround = pos[1] < groundLevel;
        return occupiedBlock || belowGround;
    }
    initListeners(playerController, hud) {
        if (this.eventListenersInitialized)
            return;
        this.eventListenersInitialized = true;
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
        throw new Error('.');
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
            if (physicsObj) {
                const oldPosition = vec3.clone(physicsObj.position);
                if (physicsObj.position.some(isNaN)) {
                    console.error(physicsObj);
                    return;
                }
                const groundLevel = this.ground.getGroundLevelY(physicsObj.position[0], physicsObj.position[2]);
                const sizeY = block.modelDef.size.h * block.modelDef.colliderScale.h;
                const halfHeight = sizeY / 20;
                const halfSize = [
                    block.modelDef.size.w * block.modelDef.colliderScale.w / 2,
                    halfHeight,
                    block.modelDef.size.d * block.modelDef.colliderScale.d / 2
                ];
                const corners = [
                    vec3.fromValues(-halfSize[0], -halfSize[1], -halfSize[2]),
                    vec3.fromValues(-halfSize[0], -halfSize[1], halfSize[2]),
                    vec3.fromValues(halfSize[0], -halfSize[1], -halfSize[2]),
                    vec3.fromValues(halfSize[0], -halfSize[1], halfSize[2]),
                    vec3.fromValues(-halfSize[0], halfSize[1], -halfSize[2]),
                    vec3.fromValues(-halfSize[0], halfSize[1], halfSize[2]),
                    vec3.fromValues(halfSize[0], halfSize[1], -halfSize[2]),
                    vec3.fromValues(halfSize[0], halfSize[1], halfSize[2])
                ];
                let lowestPoint = Infinity;
                for (const corner of corners) {
                    const rotatedCorner = vec3.create();
                    vec3.transformQuat(rotatedCorner, corner, physicsObj.orientation);
                    const worldY = physicsObj.position[1] + rotatedCorner[1];
                    lowestPoint = Math.min(lowestPoint, worldY);
                }
                if (lowestPoint < groundLevel) {
                    const correction = groundLevel - lowestPoint;
                    physicsObj.position[1] += correction;
                    physicsObj.velocity[1] = 0.0;
                    vec3.scale(physicsObj.velocity, physicsObj.velocity, 0.7);
                    vec3.scale(physicsObj.angularVelocity, physicsObj.angularVelocity, 0.5);
                    if (vec3.length(physicsObj.angularVelocity) < 0.01)
                        vec3.set(physicsObj.angularVelocity, 0, 0, 0);
                }
                if (!vec3.equals(oldPosition, physicsObj.position))
                    this.physicsGrid.updateObjectPosition(oldPosition, physicsObj);
                vec3.copy(block.position, physicsObj.position);
                mat4.identity(block.modelMatrix);
                mat4.fromQuat(block.modelMatrix, physicsObj.orientation);
                mat4.translate(block.modelMatrix, block.modelMatrix, block.position);
                mat4.scale(block.modelMatrix, block.modelMatrix, [
                    block.modelDef.size.w,
                    block.modelDef.size.h,
                    block.modelDef.size.d
                ]);
                mat4.fromRotationTranslationScale(block.modelMatrix, physicsObj.orientation, physicsObj.position, [
                    block.modelDef.size.w,
                    block.modelDef.size.h,
                    block.modelDef.size.d
                ]);
                const light = this.blockLights.get(block.id);
                if (light)
                    light.position = vec3.clone(physicsObj.position);
                const colliderIndex = this.blocks.indexOf(block);
                if (colliderIndex >= 0 && colliderIndex < this._Colliders.length) {
                    this._Colliders[colliderIndex]._offset = [
                        block.position[0] / this.positionAdjusted.x,
                        block.position[1] - this.positionAdjusted.y,
                        block.position[2] / this.positionAdjusted.z
                    ];
                }
            }
            this.lightningManager.updatePointLightBuffer();
        }
    }
    async init(canvas, playerController, format, hud) {
        await this.renderOutline(canvas, this.device, format);
        this.initListeners(playerController, hud);
        this.updateTargetBlock(playerController);
    }
}
