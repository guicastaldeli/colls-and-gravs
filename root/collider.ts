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

export interface CollisionInfo {
    type: string;
    position?: vec3;
}

export interface ICollidable {
    getCollider(): Collider;
    getPosition(): vec3;
    onCollision?(other: ICollidable): void;
    getCollisionResponse?(other: ICollidable): CollisionResponse;
    getCollisionInfo?(): CollisionInfo;
}

export class BoxCollider implements Collider {
    public _size: vec3;
    public _offset: vec3;

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

    public rayIntersect(rayOrigin: vec3, rayDirection: vec3): {
        hit: boolean,
        distance?: number,
        faceNormal?: vec3,
        point?: vec3
    } {
        const bbox = this.getBoundingBox();
        const min = bbox.min;
        const max = bbox.max;

        let tmin = (min[0] - rayOrigin[0]) / rayDirection[0];
        let tmax = (max[0] - rayOrigin[0]) / rayDirection[0];
        if(tmin > tmax) [tmin, tmax] = [tmax, tmin];

        let tymin = (min[1] - rayOrigin[1]) / rayDirection[1];
        let tymax = (max[1] - rayOrigin[1]) / rayDirection[1];
        if(tymin > tymax) [tymin, tymax] = [tymax, tymin];
        if((tmin > tymax) || (tymin > tmax)) return { hit: false }
        if(tymin > tmin) tmin = tymin;
        if(tymax < tmax) tmax = tymax;

        let tzmin = (min[2] - rayOrigin[2]) / rayDirection[2];
        let tzmax = (max[2] - rayOrigin[2]) / rayDirection[2];
        if(tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
        if((tmin > tzmax) || (tzmin > tmax)) return { hit: false };
        if(tzmin > tmin) tmin = tzmin;
        if(tzmax < tmax) tmax = tzmax;

        if(tmax < 0) return { hit: false };
        const t = tmin >= 0 ? tmin : tmax;
        if(t < 0) return { hit: false };

        const point = vec3.create();
        vec3.scaleAndAdd(point, rayOrigin, rayDirection, t);

        const faceNormal = vec3.create();
        const epsilon = 0.0001;

        if(Math.abs(point[0] - min[0]) < epsilon) faceNormal[0] = -1;
        else if (Math.abs(point[0] - max[0]) < epsilon) faceNormal[0] = 1;
        else if (Math.abs(point[1] - min[1]) < epsilon) faceNormal[1] = -1;
        else if (Math.abs(point[1] - max[1]) < epsilon) faceNormal[1] = 1;
        else if (Math.abs(point[2] - min[2]) < epsilon) faceNormal[2] = -1;
        else if (Math.abs(point[2] - max[2]) < epsilon) faceNormal[2] = 1;

        return {
            hit: true,
            distance: tmin,
            faceNormal,
            point
        }
    }
}
