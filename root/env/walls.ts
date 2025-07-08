import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { BoxCollider, Collider, CollisionInfo, CollisionResponse, ICollidable } from "../collision/collider.js";
import { StructureManager } from "./structure-manager.js";
import { PlayerController } from "../player/player-controller.js";

interface WallData extends EnvBufferData {
    id?: string,
    modelMatrix: mat4;
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    texture: GPUTexture;
    sampler: GPUSampler;
    resourceId?: string;
}

interface WallResource {
    vertex: GPUBuffer;
    color: GPUBuffer;
    index: GPUBuffer;
    indexCount: number;
    texture: GPUTexture;
    sampler: GPUSampler;
    referenceCount: number;
}

export class Walls implements ICollidable {
    private device: GPUDevice;
    private loader: Loader;
    
    private structureManager: StructureManager;
    private blocks: WallData[] = [];
    private blockIdCounter: number = 0;
    private _Collider: BoxCollider[] = [];

    private source: Map<string, WallResource> = new Map();
    private id: string = 'default-wall';

    private pos = {
        x: 0.5,
        y: 0,
        z: 2
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.structureManager = new StructureManager();
    }

    private async loadAssets(): Promise<void> {
        try {
            const model = await this.loader.parser('./assets/env/obj/smile.obj');
            const texture = await this.loader.textureLoader('./assets/env/textures/smile.png');
    
            this.source.set(this.id, {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                texture: texture,
                sampler: this.loader.createSampler(),
                referenceCount: 0
            });
        } catch(err) {
            throw err;
        }
    }

    private getResource(id: string): WallResource {
        const resource = this.source.get(id);
        if(!resource) throw new Error(`${id} not found`);
        resource.referenceCount++;
        return resource;
    }

    private async createWallBlock(): Promise<{ 
        block: WallData, 
        collider: BoxCollider 
    }> {
        const size = this.structureManager.getSize();
        const gap = this.structureManager.getGap();

        const source = this.getResource(this.id);
        if(!source) throw new Error('err');

        const block: WallData = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix: mat4.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        }

        const position = vec3.fromValues(
            this.pos.x * gap,
            this.pos.y,
            this.pos.z * gap
        );

        mat4.identity(block.modelMatrix);

        mat4.translate(
            block.modelMatrix, 
            block.modelMatrix,
            position
        );

        mat4.scale(
            block.modelMatrix,
            block.modelMatrix,
            [size.w, size.h, size.d]
        );

        const collider = new BoxCollider(
            [
                size.w,
                size.h,
                size.d
            ],
            position
        );

        this.blocks.push(block);
        return { block, collider };
    }

    public async createWall(): Promise<void> {
        const pattern = ['##########']

        const { 
            blocks, 
            colliders 
        } = await this.structureManager.createFromPattern(
            pattern,
            vec3.create(),
            this.createWallBlock.bind(this)
        );

        this.blocks = blocks;
        this._Collider = colliders;
    }

    public getPosition(): vec3 {
        return vec3.fromValues(0, 0, 0);
    }

    public getCollider(): Collider {
        return this._Collider.length > 0
        ? this._Collider[0]
        : new BoxCollider([0, 0, 0], [0, 0, 0]);
    }

    public getCollisionInfo(): CollisionInfo {
        return {
            type: 'wall',
            position: this.getPosition()
        }
    }

    public getAllColliders(): {
        collider: Collider,
        position: vec3,
        type: string
    }[] {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider as BoxCollider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }

    public getBlocks(): WallData[] {
        return this.blocks;
    }

    public async init(): Promise<void> {
        await this.loadAssets();
        await this.createWall();
    }
}