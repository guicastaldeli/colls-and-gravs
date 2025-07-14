import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class WindManager {
    tick;
    _direction = vec3.fromValues(1.0, 0.0, 0.0);
    _strength = 0.1;
    constructor(tick) {
        this.tick = tick;
    }
    getWindForce(time) {
        const deltaTime = time * this.tick.getDeltaTime();
        const noise = Math.sin(deltaTime * 0.002) * 0.5 + 0.5;
        const force = vec3.create();
        vec3.scale(force, this._direction, this._strength * noise);
        return force;
    }
}
