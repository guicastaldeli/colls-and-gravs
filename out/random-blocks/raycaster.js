import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class Raycaster {
    rayAABBIntersect(rayOrigin, rayDirection, boxMin, boxMax) {
        let tmin = -Infinity;
        let tmax = Infinity;
        const normalizedDir = vec3.create();
        vec3.normalize(normalizedDir, rayDirection);
        for (let i = 0; i < 3; i++) {
            if (Math.abs(normalizedDir[i]) < 0.001) {
                if (rayOrigin[i] < boxMin[i] || rayOrigin[i] > boxMax[i]) {
                    return { hit: false };
                }
                continue;
            }
            const invDir = 1 / normalizedDir[i];
            let t1 = (boxMin[i] - rayOrigin[i]) * invDir;
            let t2 = (boxMax[i] - rayOrigin[i]) * invDir;
            if (invDir < 0)
                [t1, t2] = [t2, t1];
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax)
                return { hit: false };
            if (tmax < 0)
                return { hit: false };
        }
        if (tmin >= 0) {
            return { hit: true, distance: tmin };
        }
        else if (tmax >= 0) {
            return { hit: true, distance: tmax };
        }
        return { hit: false };
    }
}
