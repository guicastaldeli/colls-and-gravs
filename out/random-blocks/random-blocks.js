import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collider.js";
import { ResourceManager } from "./resource-manager.js";
import { Raycaster } from "./raycaster.js";
import { OutlineConfig } from "./outline-config.js";
export class RandomBlocks {
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
    _Colliders = [];
    type = 'block';
    raycaster;
    outline;
    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    };
    constructor(device, loader, shaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();
        this.raycaster = new Raycaster();
        this.outline = new OutlineConfig(device, shaderLoader);
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
            const collider = new BoxCollider([this.size.w * 8, this.size.h * 10, this.size.d * 10], [position[0] / 55, position[1] - 1.5, position[2] / 65]);
            this.blocks.push(newBlock);
            this._Colliders.push(collider);
            playerController.updateCollidables();
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
        this.updateTargetBlock(playerController);
        if (this.targetBlockIndex >= 0) {
            const blockToRemove = this.targetBlockIndex;
            this.removeBlock(blockToRemove);
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        const minDistance = 2.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
        const blockPos = vec3.create();
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
    async init(canvas, playerController, format, hud) {
        await this.renderOutline(canvas, this.device, format);
        this.initListeners(playerController, hud);
        this.updateTargetBlock(playerController);
    }
}
