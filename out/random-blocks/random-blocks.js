import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collider.js";
import { ResourceManager } from "./resource-manager.js";
export class RandomBlocks {
    device;
    loader;
    shaderLoader;
    blocks = [];
    _Colliders = [];
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
    constructor(device, loader, shaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
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
            mat4.scale(modelMatrix, modelMatrix, [0.1, 0.1, 0.1]);
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
            console.log("block id:", this.blocks[this.blocks.length - 1].indexCount);
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
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);
            if (intersection?.hit && intersection.distance !== undefined) {
                if (intersection.distance < maxDistance && intersection.distance < closestDistance) {
                    closestDistance = intersection.distance;
                    this.targetBlockIndex = i;
                }
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
            const blockToRemove = this.blocks[this.targetBlockIndex];
            const blockCollidable = {
                getCollider: () => blockToRemove.collider,
                getPosition: () => blockToRemove.position,
                id: blockToRemove.id
            };
            playerController.removeCollidable(blockCollidable);
            this.removeBlock(this.targetBlockIndex);
        }
    }
    async addBlocksRaycaster(playerController, hud) {
        const minDistance = 1.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
        const blockPos = vec3.create();
        blockPos[0] = Math.round(targetPos[0]);
        blockPos[1] = Math.round(targetPos[1]);
        blockPos[2] = Math.round(targetPos[2]);
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
    //Outline
    outlinePipeline;
    outlineBindGroup;
    outlineUniformBuffer;
    outlineDepthTexture;
    async initOutline(canvas, device, format) {
        const [vertexShader, fragShader] = await Promise.all([
            this.shaderLoader.loader('./random-blocks/shaders/vertex.wgsl'),
            this.shaderLoader.loader('./random-blocks/shaders/frag.wgsl'),
        ]);
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: { type: 'uniform' }
                }]
        });
        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });
        this.outlinePipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }]
                    },
                    {
                        arrayStride: 8 * 4,
                        attributes: [{
                                shaderLocation: 1,
                                offset: 0,
                                format: 'float32x3'
                            }]
                    }
                ]
            },
            fragment: {
                module: fragShader,
                entryPoint: 'main',
                targets: [{
                        format: format,
                    }]
            },
            primitive: {
                topology: 'line-list',
                cullMode: 'none'
            },
            depthStencil: {
                depthWriteEnabled: false,
                depthCompare: 'always',
                format: 'depth24plus'
            }
        });
        this.outlineUniformBuffer = device.createBuffer({
            size: 4 * 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });
        this.outlineBindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                    binding: 0,
                    resource: { buffer: this.outlineUniformBuffer }
                }]
        });
        this.outlineDepthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    //
    init(canvas, playerController, hud) {
        this.initListeners(playerController, hud);
        this.updateTargetBlock(playerController);
    }
}
