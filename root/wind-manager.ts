import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { Tick } from "./tick.js";

export class WindManager {
    private tick: Tick;
    private _direction: vec3 = vec3.fromValues(1.0, 0.0, 0.0);
    private _strength: number = 0.1;

    constructor(tick: Tick) {
        this.tick = tick;
    }

    public getWindForce(time: number) {
        const deltaTime = time * this.tick.getDeltaTime();

        const noise = Math.sin(deltaTime * 0.002) * 0.5 + 0.5;
        const force = vec3.create();
        vec3.scale(force, this._direction, this._strength * noise);
        return force;
    }
}