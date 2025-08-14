import { mat3, mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "./env-buffers.js";
import { Loader } from "../loader.js";
import { BoxCollider, Collider, CollisionInfo, ICollidable } from "../collision/collider.js";
import { StructureManager } from "./structure-manager.js";
import { Patterns } from "./patterns.interface.js";

interface PatternPos {
    x: number;
    y: number;
    z: number
}
interface Pattern {
    pos: PatternPos;
    pattern: string[];
    rotation?: {
        axis: 'x' | 'y' | 'z';
        angle: number;
    }
}

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
        x: 0.0,
        y: 0.0,
        z: 5.0
    }

    private collisionScale = {
        w: 40.0,
        h: 40.0,
        d: 40.0
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.device = device;
        this.loader = loader;
        this.structureManager = new StructureManager();
    }

    private async loadAssets(): Promise<void> {
        try {
            const model = await this.loader.parser('./.assets/env/obj/walls.obj');
            const texture = await this.loader.textureLoader('./.assets/env/textures/walls.png');
    
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

    private async createWallBlock(
        position: vec3,
        isBlock: boolean,
        rotation?: {
            axis: 'x' | 'y' | 'z';
            angle: number;
        }
    ): Promise<{ 
        block: WallData | null, 
        collider: BoxCollider | null
    }> {
        if(!isBlock) return { block: null, collider: null }

        const size = this.structureManager.getSize();
        const source = this.getResource(this.id);
        if(!source) throw new Error('err');

        const block: WallData = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix: mat4.create(),
            normalMatrix: mat3.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        }

        mat4.identity(block.modelMatrix);

        if(rotation) {
            switch(rotation.axis) {
                case 'x':
                    mat4.rotateX(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
                case 'y':
                    mat4.rotateY(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
                case "z":
                    mat4.rotateZ(block.modelMatrix, block.modelMatrix, rotation.angle);
                    break;
            }
        }

        mat4.translate(block.modelMatrix, block.modelMatrix, position);
        mat4.scale(block.modelMatrix, block.modelMatrix, [size.w, size.h, size.d]);

        const collider = isBlock ? 
        new BoxCollider(
            [
                size.w * this.collisionScale.w,
                size.h * this.collisionScale.h,
                size.d * this.collisionScale.d
            ],
            position
        ) : null;

        this.blocks.push(block);
        return { block, collider };
    }

    public async createWall(): Promise<void> {
        this.blocks = [];
        this._Collider = [];
        const patternDataArray = await this.loadPatternData();
        const patternData = patternDataArray[0];

        const patterns: Record<string, Pattern> = {
            rightWall: {
                pos: {
                    x: -2.0,
                    y: 0.0,
                    z: 19.0
                },
                pattern: patternData.patterns.wall.rightWall
            },
            leftWall: {
                pos: {
                    x: -2.0,
                    y: 0.0,
                    z: 0.0
                },
                pattern: patternData.patterns.wall.leftWall
            },
            ceiling: {
                pos: {
                    x: 0.0,
                    y: 0.0,
                    z: -6.0
                },
                rotation: {
                    axis: 'x',
                    angle: Math.PI / 2
                },
                pattern: patternData.patterns.ceiling
            }
        }

        for(const [name, data] of Object.entries(patterns)) {
            const position = vec3.fromValues(data.pos.x, data.pos.y, data.pos.z)
            const { blocks, colliders } = await this.structureManager.createFromPattern(
                data.pattern,
                position,
                this.createWallBlock.bind(this),
                data.rotation
            )

            this.blocks.push(...blocks.filter(b => b !== null) as WallData[]);
            this._Collider.push(...colliders.filter(c => c !== null) as BoxCollider[]);
        }
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

    private async loadPatternData(): Promise<Patterns> {
        try {
            const res = await fetch('./.data/patterns.json');
            if(!res.ok) throw new Error(`err, ${res.status}`);
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async init(): Promise<void> {
        await this.loadAssets();
        await this.createWall();
    }
}