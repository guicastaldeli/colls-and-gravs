import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

import { initBuffers } from "./random-blocks-buffer.js";
import { BoxCollider, Collider, ICollidable } from "../collider.js";
import { Loader } from "../loader.js";
import { ResourceManager } from "./resource-manager.js";
import { PlayerController } from "../player-controller.js";
import { Hud } from "../hud.js";
import { ShaderLoader } from "../shader-loader.js";

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

    private blocks: BlockData[] = [];
    private _Colliders: BoxCollider[] = [];
    private resourceManager: ResourceManager;
    private blockIdCounter: number = 0;
    public targetBlockIndex: number = -1;

    private sharedResources: Map<string, SharedResource> = new Map();
    private defaultSharedResourceId = 'default-m';

    private lastMouseClickTime: number = 0;
    private clickCooldown: number = 0;
    private keyPressed: boolean = false;

    private preloadModel: any;
    private preloadTex!: GPUTexture;

    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.resourceManager = new ResourceManager(device);
        this.preloadAssets();
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
    
            console.log("block id:", this.blocks[this.blocks.length - 1].id);
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
        if(this.targetBlockIndex >= 0) this.removeBlock(this.targetBlockIndex);

        const maxDistance: number = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();

        let closestBlock: { 
            block: BlockData,
            i: number,
            distance: number,
        } | null = null;
        
        for(let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];            
            const intersection = block.collider.rayIntersect(rayOrigin, rayDirection);

            if(intersection?.hit) {
                if(!intersection.distance) return;
                const distance = intersection.distance;

                if(distance <= maxDistance) {
                    if(!closestBlock || distance < closestBlock.distance) {
                        closestBlock = {
                            block,
                            i,
                            distance
                        }
                    }
                }
            }
        }

        if(closestBlock) {
            const blockToRemove = closestBlock.block;

            const blockCollidable = {
                getCollider: () => blockToRemove.collider,
                getPosition: () => blockToRemove.position,
                id: blockToRemove.id
            }

            try {
                playerController.removeCollidable(blockCollidable);
                this.removeBlock(closestBlock.i);
            } catch(err) {
                console.error(err);
            }
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
                const newBlock = await this.addBlock(placementPos);

                const newBlockCollidable = {
                    getCollider: () => newBlock.collider,
                    getPosition: () => newBlock.position,
                    id: newBlock.id
                };

                playerController.addCollidable(newBlockCollidable);
            }
        } else {
            const targetPos = hud.getCrosshairWorldPos(rayOrigin, rayDirection, minDistance);
            const blockPos = vec3.create();

            vec3.copy(blockPos, targetPos);
            blockPos[1] -= 0.4;

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

    //Outline
        public outlinePipeline!: GPURenderPipeline;
        public outlineBindGroup!: GPUBindGroup;
        public outlineUniformBuffer!: GPUBuffer;
        public outlineDepthTexture!: GPUTexture;

        public async initOutline(
            device: GPUDevice,
            format: GPUTextureFormat
        ): Promise<void> {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./shaders/vertex.wgsl'),
                this.shaderLoader.loader('./shaders/vertex.wgsl'),
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
                    buffers: [{
                        arrayStride: 3 * 4,
                        attributes: [{
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x3'
                        }]
                    }]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                        format: format,
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'
                },
                depthStencil: {
                    depthWriteEnabled: false,
                    depthCompare: 'less-equal',
                    format: 'depth24plus'
                }
            });

            this.outlineUniformBuffer = device.createBuffer({
                size: 4 * 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });

            this.outlineBindGroup = device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0,
                    resource: { buffer: this.outlineUniformBuffer }
                }]
            });

            this.outlineDepthTexture = device.createTexture({
                size: [device.limits.maxTextureDimension2D, device.limits.maxTextureDimension2D],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
        }

    //

    public init(
        canvas: HTMLCanvasElement, 
        playerController: PlayerController,
        hud: Hud
    ): void {
        this.initListeners(playerController, hud);
    }
}