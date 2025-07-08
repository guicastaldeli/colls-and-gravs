import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collision/collider.js";
import { StructureManager } from "./structure-manager.js";
export class Walls {
    device;
    loader;
    structureManager;
    blocks = [];
    blockIdCounter = 0;
    _Collider = [];
    source = new Map();
    id = 'default-wall';
    pos = {
        x: 0.5,
        y: 0,
        z: 2
    };
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
        this.structureManager = new StructureManager();
    }
    async loadAssets() {
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
        }
        catch (err) {
            throw err;
        }
    }
    getResource(id) {
        const resource = this.source.get(id);
        if (!resource)
            throw new Error(`${id} not found`);
        resource.referenceCount++;
        return resource;
    }
    async createWallBlock() {
        const size = this.structureManager.getSize();
        const gap = this.structureManager.getGap();
        const source = this.getResource(this.id);
        if (!source)
            throw new Error('err');
        const block = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix: mat4.create(),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        };
        const position = vec3.fromValues(this.pos.x * gap, this.pos.y, this.pos.z * gap);
        mat4.identity(block.modelMatrix);
        mat4.translate(block.modelMatrix, block.modelMatrix, position);
        mat4.scale(block.modelMatrix, block.modelMatrix, [size.w, size.h, size.d]);
        const collider = new BoxCollider([
            size.w,
            size.h,
            size.d
        ], position);
        this.blocks.push(block);
        return { block, collider };
    }
    async createWall() {
        const pattern = ['##########'];
        const { blocks, colliders } = await this.structureManager.createFromPattern(pattern, vec3.create(), this.createWallBlock.bind(this));
        this.blocks = blocks;
        this._Collider = colliders;
    }
    getPosition() {
        return vec3.fromValues(0, 0, 0);
    }
    getCollider() {
        return this._Collider.length > 0
            ? this._Collider[0]
            : new BoxCollider([0, 0, 0], [0, 0, 0]);
    }
    getCollisionInfo() {
        return {
            type: 'wall',
            position: this.getPosition()
        };
    }
    getAllColliders() {
        return this._Collider.map((collider, i) => ({
            collider,
            position: vec3.clone(collider)['_offset'],
            type: this.getCollisionInfo().type
        }));
    }
    getBlocks() {
        return this.blocks;
    }
    async init() {
        await this.loadAssets();
        await this.createWall();
    }
}
