import { mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";

export interface Collider {
    checkCollision(other: Collider): boolean;
    getBoundingBox(position?: vec3): { min: vec3, max: vec3 };
    getSize(): vec3;
    getCorners(position: vec3, orientation: quat): vec3[];
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
    public _orientation: quat = quat.create();

    constructor(_size?: vec3, _offset?: vec3, _orientation?: quat) {
        this._size = vec3.clone(_size);
        this._offset = _offset ? vec3.clone(_offset) : vec3.create();
        if(_orientation) this._orientation = quat.clone(_orientation);
    }

    public getBoundingBox(position?: vec3): { min: vec3; max: vec3; } {
        if(!quat.equals(this._orientation, quat.create())) {
            const corners = this.getCorners(position || this._offset, this._orientation);
            const min = vec3.clone(corners[0]);
            const max = vec3.clone(corners[0]);
            
            for(let i = 1; i < corners.length; i++) {
                vec3.min(min, min, corners[i]);
                vec3.max(max, max, corners[i]);
            }

            return { min, max }
        }
        
        const halfSize = vec3.create();
        vec3.scale(halfSize, this._size, 0.5);
        const center = position ? vec3.add(vec3.create(), position, this._offset) : this._offset;

        return {
            min: vec3.sub(vec3.create(), center, halfSize),
            max: vec3.add(vec3.create(), center, halfSize)
        }
    }

    public getCorners(
        position: vec3,
        orientation: quat
    ): vec3[] {
        const halfSize = vec3.scale(vec3.create(), this._size, 0.5);

        const corners = [
            vec3.fromValues(-halfSize[0], -halfSize[1], -halfSize[2]),
            vec3.fromValues(halfSize[0], -halfSize[1], -halfSize[2]),
            vec3.fromValues(-halfSize[0], halfSize[1], -halfSize[2]),
            vec3.fromValues(halfSize[0], halfSize[1], -halfSize[2]),
            vec3.fromValues(-halfSize[0], -halfSize[1], halfSize[2]),
            vec3.fromValues(halfSize[0], -halfSize[1], halfSize[2]),
            vec3.fromValues(-halfSize[0], halfSize[1], halfSize[2]),
            vec3.fromValues(halfSize[0], halfSize[1], halfSize[2])
        ];

        const rotatedCorners: vec3[] = [];
        const rotationMatrix = mat4.fromQuat(mat4.create(), orientation);

        for(const corner of corners) {
            const rotatedCorner = vec3.transformMat4(vec3.create(), corner, rotationMatrix);
            vec3.add(rotatedCorner, rotatedCorner, position);
            rotatedCorners.push(rotatedCorner);
        }

        return rotatedCorners;
    }

    public getSize(): vec3 {
        return vec3.clone(this._size);
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

    private overlapsOnAxis(
        pos1: vec3,
        size1: vec3,
        rot1: quat,
        pos2: vec3,
        size2: vec3,
        rot2: quat,
        axis: vec3
    ): boolean {
        const proj1 = this.getProjection(pos1, size1, rot1, axis);
        const proj2 = this.getProjection(pos2, size2, rot2, axis);
        return proj1.min <= proj2.max && proj2.min <= proj1.max;
    }

    private getProjection(
        pos: vec3,
        size: vec3,
        rot: quat,
        axis: vec3
    ): {
        min: number,
        max: number
    } {
        const corners = this.getCorners(pos, rot);
        let min = Infinity;
        let max = -Infinity;

        for(const corner of corners) {
            const proj = vec3.dot(corner, axis);
            min = Math.min(min, proj);
            max = Math.max(max, proj);
        }

        return { min, max };
    }

    public checkCollision(
        other: BoxCollider,
        otherPosition?: vec3,
        otherOrientation?: quat
    ): boolean {
        if(other instanceof BoxCollider) {
            if(!quat.equals(this._orientation, quat.create) ||
            (otherOrientation && !quat.equals(otherOrientation, quat.create()))) {
                return this.checkOBBCollision(
                    this._offset,
                    this._size,
                    this._orientation,
                    otherPosition || other._offset,
                    other._size,
                    otherOrientation || other._orientation
                );
            }

            const a = this.getBoundingBox();
            const b = other.getBoundingBox(otherPosition);
    
            return (
                a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
                a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
                a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
            );
        }

        return false;
    }

    private checkOBBCollision(
        pos1: vec3,
        size1: vec3,
        rot1: quat,
        pos2: vec3,
        size2: vec3,
        rot2: quat
    ): boolean {
        const axes: vec3[] = [];
        const mat1 = mat4.fromQuat(mat4.create(), rot1);
        const mat2 = mat4.fromQuat(mat4.create(), rot2);

        axes.push(vec3.fromValues(mat1[0], mat1[1], mat1[2]));
        axes.push(vec3.fromValues(mat1[4], mat1[5], mat1[6]));
        axes.push(vec3.fromValues(mat1[8], mat1[9], mat1[10]));

        axes.push(vec3.fromValues(mat2[0], mat2[1], mat2[2]));
        axes.push(vec3.fromValues(mat2[4], mat2[5], mat2[6]));
        axes.push(vec3.fromValues(mat2[8], mat2[9], mat2[10]));

        for(let i = 0; i < 3; i++) {
            for(let j = 0; j < 3; j++) {
                const axis = vec3.cross(
                    vec3.create(),
                    vec3.fromValues(mat1[i * 4], mat1[i * 4 + 1], mat1[i * 4 + 2]),
                    vec3.fromValues(mat2[i * 4], mat2[i * 4 + 1], mat2[i * 4 + 2]),
                );

                if(vec3.length(axis) > 0.0001) {
                    vec3.normalize(axis, axis);
                    axes.push(axis);
                }
            }
        }

        for(const axis of axes) {
            if(
                !this.overlapsOnAxis(
                    pos1,
                    size1,
                    rot1,
                    pos2,
                    size2,
                    rot2,
                    axis
                )
            ) {
                return false;
            }
        }

        return true;
    }
}
