import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class WindManager {
    tick;
    _direction = vec3.fromValues(1.0, 0.5, 0.5);
    _strength = 5.0;
    _turbulence = 0.3;
    _gustiness = 0.5;
    constructor(tick) {
        this.tick = tick;
        vec3.normalize(this._direction, this._direction);
    }
    getWindForce(time) {
        const deltaTime = time * this.tick.getDeltaTime();
        const noise = Math.sin(deltaTime * 0.002) * 0.5 + 0.5;
        const turbulence = Math.sin(deltaTime * 0.01 + Math.cos(deltaTime * 0.007)) * this._turbulence;
        const gustFactor = Math.max(0, Math.sin(deltaTime * 0.0003)) * this._gustiness;
        const totalStrength = this._strength * (0.7 + 0.3 * noise + turbulence + gustFactor);
        const force = vec3.create();
        vec3.scale(force, this._direction, totalStrength);
        force[1] += Math.sin(deltaTime * 0.0015) * 0.1;
        return force;
    }
}
