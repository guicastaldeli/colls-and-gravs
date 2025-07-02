import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collider.js";
import { ResourceManager } from "./resource-manager.js";
export class RandomBlocks {
    device;
    loader;
    blocks = [];
    _Colliders = [];
    resourceManager;
    blockIdCounter = 0;
    sharedResources = new Map();
    defaultSharedResourceId = 'default-m';
    lastMouseClickTime = 0;
    clickCooldown = 0;
    keyPressed = false;
    preloadModel;
    preloadTex;
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();
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
    getBlocks() {
        return this.blocks;
    }
    getColliders() {
        return this.blocks.map(block => ({
            getCollider: () => block.collider,
            getPosition: () => block.position
        }));
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
    async addBlock(position) {
        try {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, position);
            const collider = new BoxCollider([1, 1, 1], [position[0], position[1], position[2]]);
            const sharedResource = this.addSharedResource(this.defaultSharedResourceId);
            if (!sharedResource)
                throw new Error('err');
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
            };
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            console.log("block id:", this.blocks[this.blocks.length - 1].id);
            return newBlock;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    removeBlock(i) {
        if (i < 0 || i >= this.blocks.length)
            return;
        if (i >= 0 && i < this.blocks.length) {
            const block = this.blocks[i];
            if (!block)
                return;
            this.blocks.splice(i, 1);
            this._Colliders.splice(i, 1);
            this.releaseSharedResource(block.sharedResourceId);
            const resouce = this.sharedResources.get(block.sharedResourceId);
            if (!resouce)
                this.resourceManager.waitCleanup();
        }
    }
    removeBlockRaycaster(playerController) {
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestBlock = null;
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);
            if (intersection?.hit) {
                if (!intersection.distance)
                    return;
                const distance = intersection.distance;
                if (distance <= maxDistance) {
                    if (!closestBlock || distance < closestBlock.distance) {
                        closestBlock = {
                            block,
                            i,
                            distance
                        };
                    }
                }
            }
        }
        if (closestBlock) {
            const blockToRemove = closestBlock.block;
            const blockCollidable = {
                getCollider: () => blockToRemove.collider,
                getPosition: () => blockToRemove.position,
                id: blockToRemove.id
            };
            try {
                playerController.removeCollidable(blockCollidable);
                this.removeBlock(closestBlock.i);
            }
            catch (err) {
                console.error(err);
            }
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        const minDistance = 1.0;
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        let closestIntersection = null;
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);
            if (intersection?.hit &&
                intersection.distance !== undefined &&
                intersection.distance >= minDistance &&
                intersection.distance <= maxDistance &&
                (!closestIntersection || intersection.distance < closestIntersection.distance)) {
                closestIntersection = {
                    blockIndex: i,
                    distance: intersection.distance,
                    faceNormal: intersection.faceNormal,
                    intercetionPoint: intersection.point
                };
            }
        }
        if (closestIntersection) {
            const placementOffset = vec3.create();
            vec3.scale(placementOffset, closestIntersection.faceNormal, 1.0);
            const placementPos = vec3.create();
            vec3.add(placementPos, closestIntersection.intercetionPoint, placementOffset);
            placementPos[0] = Math.abs(placementPos[0]);
            placementPos[1] = Math.abs(placementPos[1]);
            placementPos[2] = Math.abs(placementPos[2]);
            const positionOccupied = this.blocks.some(block => block.position[0] === placementPos[0] &&
                block.position[1] === placementPos[1] &&
                block.position[2] === placementPos[2]);
            if (!positionOccupied) {
                const newBlock = await this.addBlock(placementPos);
                const newBlockCollidable = {
                    getCollider: () => newBlock.collider,
                    getPosition: () => newBlock.position,
                    id: newBlock.id
                };
                playerController.addCollidable(newBlockCollidable);
            }
        }
        else {
            const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
            const blockPos = vec3.create();
            vec3.copy(blockPos, targetPos);
            blockPos[1] -= 0.4;
            const positionOccupied = this.blocks.some(block => block.position[0] === blockPos[0] &&
                block.position[1] === blockPos[1] &&
                block.position[2] === blockPos[2]);
            if (!positionOccupied) {
                await this.addBlock(blockPos);
                const newBlockCollidable = {
                    getCollider: () => this.blocks[this.blocks.length - 1].collider,
                    getPosition: () => this.blocks[this.blocks.length - 1].position,
                    id: this.blocks[this.blocks.length - 1].id
                };
                playerController.addCollidable(newBlockCollidable);
            }
        }
    }
    initListeners(playerController, hud) {
        document.addEventListener('click', async (e) => {
            const eKey = e.button;
            if (eKey === 0)
                await this.addBlocksRaycaster(playerController, hud);
            if (eKey === 2)
                this.removeBlockRaycaster(playerController);
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
    init(canvas, playerController, hud) {
        this.initListeners(playerController, hud);
    }
}
