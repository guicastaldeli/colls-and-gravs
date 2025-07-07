import { mat4, vec3 } from "../../../node_modules/gl-matrix/esm/index.js";

export class Raycaster {
    public rayAABBIntersect(
        rayOrigin: vec3,
        rayDirection: vec3,
        boxMin: vec3,
        boxMax: vec3
    ): {
        hit: boolean,
        distance?: number,
        normal?: vec3,
        face?: number
    } {
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
            return { 
                hit: true, 
                distance: tmin,
                normal: normal,
                face: face
            }
        } else if(tmax >= 0) {
            return { 
                hit: true, 
                distance: tmax,
                normal: normal,
                face: face 
            }
        }
        return { hit: false }
    }
}