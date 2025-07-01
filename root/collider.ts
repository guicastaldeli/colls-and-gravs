import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

export interface Collider {
    checkCollision(other: Collider): boolean;
    getBoundingBox(position?: vec3): { min: vec3, max: vec3 }
}

export enum CollisionResponse {
    BLOCK,
    OVERLAP,
    IGNORE
}

export interface ICollidable {
    getCollider(): Collider;
    getPosition(): vec3;
    onCollision?(other: ICollidable): void;
    getCollisionResponse?(other: ICollidable): CollisionResponse;
}

export class BoxCollider implements Collider {
    private _size: vec3;
    private _offset: vec3;

    constructor(_size: vec3, _offset?: vec3) {
        this._size = vec3.clone(_size);
        this._offset = _offset ? vec3.clone(_offset) : vec3.create();
    }

    public checkCollision(other: BoxCollider): boolean {
        const a = this.getBoundingBox();
        const b = other.getBoundingBox();

        return (
            a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
            a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
            a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
        );
    }

    public getBoundingBox(position?: vec3): { min: vec3; max: vec3; } {
        const halfSize = vec3.create();
        vec3.scale(halfSize, this._size, 0.5);
        const center = position ? vec3.add(vec3.create(), position, this._offset) : this._offset;

        return {
            min: vec3.sub(vec3.create(), center, halfSize),
            max: vec3.add(vec3.create(), center, halfSize)
        }
    }
}