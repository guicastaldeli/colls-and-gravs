import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
export var CollisionResponse;
(function (CollisionResponse) {
    CollisionResponse[CollisionResponse["BLOCK"] = 0] = "BLOCK";
    CollisionResponse[CollisionResponse["OVERLAP"] = 1] = "OVERLAP";
    CollisionResponse[CollisionResponse["IGNORE"] = 2] = "IGNORE";
})(CollisionResponse || (CollisionResponse = {}));
export class BoxCollider {
    _size;
    _offset;
    constructor(_size, _offset) {
        this._size = vec3.clone(_size);
        this._offset = _offset ? vec3.clone(_offset) : vec3.create();
    }
    checkCollision(other) {
        const a = this.getBoundingBox();
        const b = other.getBoundingBox();
        return (a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
            a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
            a.min[2] <= b.max[2] && a.max[2] >= b.min[2]);
    }
    getBoundingBox(position) {
        const halfSize = vec3.create();
        vec3.scale(halfSize, this._size, 0.5);
        const center = position ? vec3.add(vec3.create(), position, this._offset) : this._offset;
        return {
            min: vec3.sub(vec3.create(), center, halfSize),
            max: vec3.add(vec3.create(), center, halfSize)
        };
    }
}
