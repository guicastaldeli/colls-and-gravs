import { mat4, vec3, quat } from "../../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../../collision/collider.js";

export class Raycaster {
    private boxCollider?: BoxCollider;
    public enabled: boolean = true;

    constructor(boxCollider?: BoxCollider) {
        this.boxCollider = boxCollider
    }

    public setCollider(collider: BoxCollider) {
        this.boxCollider = collider;
    }

    public rayIntersect(
        rayOrigin: vec3,
        rayDirection: vec3,
        position?: vec3,
        orientation?: quat
    ): {
        hit: boolean,
        distance?: number,
        faceNormal?: vec3,
        point?: vec3
    } {
        if(!this.boxCollider) throw new Error('err');

        if(orientation && !quat.equals(orientation, quat.create())) {
            return this.rayOBBIntersect(
                rayOrigin,
                rayDirection,
                position || this.boxCollider._offset, orientation
            );
        }

        const bbox = this.boxCollider.getBoundingBox(position);
        return this.rayAABBIntersect(
            rayOrigin, 
            rayDirection,
            bbox.min,
            bbox.max
        )!;
    }

    private rayOBBIntersect(
        rayOrigin: vec3,
        rayDirection: vec3,
        position: vec3,
        orientation: quat
    ): {
        hit: boolean,
        distance?: number,
        faceNormal?: vec3,
        point?: vec3
    } {
        if(!this.boxCollider) throw new Error('obb err');
        
        const invRotation = quat.conjugate(quat.create(), orientation);
        const localRayOrigin = vec3.transformQuat(
            vec3.create(),
            vec3.sub(vec3.create(), rayOrigin, position),
            invRotation
        );
        const localRayDir = vec3.transformQuat(
            vec3.create(),
            rayDirection,
            invRotation
        );

        const halfSize = vec3.scale(vec3.create(), this.boxCollider._size, 0.5);
        const boxMin = vec3.negate(vec3.create(), halfSize);
        const boxMax = vec3.clone(halfSize);

        const result = this.rayAABBIntersect(
            localRayOrigin,
            localRayDir,
            boxMin,
            boxMax
        )!;

        if(result.hit && result.face) {
            const worldNormal = vec3.transformQuat(
                vec3.create(),
                result.face,
                orientation
            );
            
            vec3.normalize(worldNormal, worldNormal);

            return {
                hit: true,
                distance: result.distance,
                faceNormal: worldNormal,
                point: result.point ? vec3.add(
                    vec3.create(),
                    position,
                    vec3.transformQuat(
                        vec3.create(),
                        vec3.sub(vec3.create(), result.point, localRayOrigin),
                        orientation
                    )
                ) : undefined
            }
        }

        return { hit: false }
    }

    public getRayOBBIntersect(
        rayOrigin: vec3,
        rayDirection: vec3,
        center: vec3,
        halfSize: vec3,
        orientation: quat
    ): {
        hit: boolean,
        distance?: number,
        normal?: vec3,
        face?: number
    } | undefined {
        if(!this.enabled) return undefined;

        const invRotation = quat.conjugate(quat.create(), orientation);
        const localRayOrigin = vec3.transformQuat(
            vec3.create(),
            vec3.sub(vec3.create(), rayOrigin, center),
            invRotation
        );
        const localRayDir = vec3.transformQuat(
            vec3.create(),
            rayDirection,
            invRotation
        );

        const boxMin = vec3.negate(vec3.create(), halfSize);
        const boxMax = vec3.clone(halfSize);
        const result = this.rayAABBIntersect(
            localRayOrigin,
            localRayDir,
            boxMin,
            boxMax
        )!;

        if(result.hit && result.face) {
            const worldNormal = vec3.transformQuat(
                vec3.create(),
                result.face,
                orientation
            );
            vec3.normalize(worldNormal, worldNormal);
            
            return {
                hit: true,
                distance: result.distance,
                normal: worldNormal,
                face: result.face
            };
        }

        return result;
    }

    public rayAABBIntersect(
        rayOrigin: vec3,
        rayDirection: vec3,
        boxMin: vec3,
        boxMax: vec3
    ): {
        hit: boolean,
        distance?: number,
        normal?: vec3,
        face?: number,
        point?: vec3
    } | undefined {
        if(!this.enabled) return undefined;

        let tmin = -Infinity;
        let tmax = Infinity;
        const normal = vec3.create();
        let face = -1;

        const normalizedDir = vec3.create();
        vec3.normalize(normalizedDir, rayDirection);

        for(let i = 0; i < 3; i++) {
            if(Math.abs(normalizedDir[i]) < 0.001) {
                if(rayOrigin[i] < boxMin[i] || rayOrigin[i] > boxMax[i]) {
                    return { hit: false }
                }

                continue;
            }

            const invDir = 1 / normalizedDir[i];
            let t1 = (boxMin[i] - rayOrigin[i]) * invDir;
            let t2 = (boxMax[i] - rayOrigin[i]) * invDir;
            
            let tempFace = -1;
            if(invDir < 0) {
                [t1, t2] = [t2, t1]
                tempFace = i * 2;
            } else {
                tempFace = i * 2 + 1;
            }

            if(t1 > tmin) {
                tmin = t1;
                vec3.set(normal, 0, 0, 0);
                normal[i] = invDir < 0 ? 1 : -1;
                face = tempFace;
            }

            tmax = Math.min(tmax, t2);
            if(tmin > tmax) return { hit: false }
            if(tmax < 0) return { hit: false }
            
        }

        if(tmin >= 0) {
            const point = vec3.scaleAndAdd(
                vec3.create(),
                rayOrigin,
                rayDirection,
                tmin
            );
            return { 
                hit: true, 
                distance: tmin,
                normal: normal,
                face: face,
                point: point
            }
        } else if(tmax >= 0) {
            const point = vec3.scaleAndAdd(
                vec3.create(),
                rayOrigin,
                rayDirection,
                tmax
            );
            return { 
                hit: true, 
                distance: tmax,
                normal: normal,
                face: face,
                point: point
            }
        }
        return { hit: false }
    }

    public getFaceIndex(i: number): vec3 {
        const normals = [
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(0, -1, 0),
            vec3.fromValues(0, 1, 0),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(0, 0, 1) 
        ];

        return i >= 0 && i < 6 ?
        normals[i] : vec3.fromValues(0, 0, 0);
    }
}