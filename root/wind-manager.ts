import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { Tick } from "./tick.js";

export class WindManager {
    private tick: Tick;
    private _direction: vec3 = vec3.fromValues(1.0, 0.5, 0.5);
    private _strength: number = 0.1;
    private _turbulence: number = 0.3;
    private _gustiness: number = 0.5;

    constructor(tick: Tick) {
        this.tick = tick;
        vec3.normalize(this._direction, this._direction);
    }

    public getWindForce(time: number) {
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