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
    constructor(device, loader) {
        this.device = device;
        this.loader = loader;
        this.structureManager = new StructureManager();
    }
    async loadAssets() {
        try {
            const model = await this.loader.parser('./assets/env/obj/404.obj');
            const texture = await this.loader.textureLoader('./assets/env/textures/404.png');
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
            throw new Error('err');
        }
    }
    getResouce(id) {
        const resource = this.source.get(id);
        if (resource) {
            resource.referenceCount++;
            return resource;
        }
        return null;
    }
    async createWallBlock(position) {
        const modelMatrix = mat4.create();
        const blockSize = this.structureManager.getSize();
        mat4.translate(modelMatrix, modelMatrix, position);
        mat4.scale(modelMatrix, modelMatrix, [
            blockSize.w,
            blockSize.h,
            blockSize.d
        ]);
        const source = this.getResouce(this.id);
        if (!source)
            throw new Error('err');
        const block = {
            id: `block-${this.blockIdCounter++}`,
            modelMatrix,
            position: vec3.clone(position),
            vertex: source.vertex,
            color: source.color,
            index: source.index,
            indexCount: source.indexCount,
            texture: source.texture,
            sampler: source.sampler,
            resourceId: this.id
        };
        const collider = new BoxCollider([
            blockSize.w,
            blockSize.h,
            blockSize.d
        ], position);
        this.blocks.push(block);
        return { block, collider };
    }
    async createWall() {
        await this.loadAssets();
        const pattern = [
            "#########",
            "#       #",
            "#########"
        ];
        const { blocks, colliders } = await this.structureManager.createFromPattern(pattern, vec3.fromValues(0, 0, 0), this.createWallBlock.bind(this));
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
    async init() {
        await this.createWall();
    }
}
