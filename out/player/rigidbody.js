import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class Rigidbody {
    _velocity = vec3.create();
    _acceleration = vec3.create();
    _isColliding = false;
    _gravity = vec3.fromValues(0.0, -20.0, 0.0);
    _mass = 1.0;
    _drag = 1.5;
    _timer = 0.0;
    _tolerance = 0.5;
    update(deltaTime, position) {
        deltaTime = Math.min(deltaTime, 0.1);
        if (!this._isColliding)
            this._timer = Math.max(0, this._timer - deltaTime);
        if (this._timer <= 0)
            vec3.scaleAndAdd(this._acceleration, this._acceleration, this._gravity, deltaTime);
        vec3.scaleAndAdd(this._velocity, this._velocity, this._acceleration, deltaTime);
        const deltaVelocity = vec3.create();
        vec3.scale(deltaVelocity, this._velocity, deltaTime);
        vec3.add(position, position, deltaVelocity);
        vec3.scale(this._velocity, this._velocity, 1 - (this._drag * deltaTime));
        vec3.set(this._acceleration, 0, 0, 0);
    }
    addForce(f) {
        vec3.scaleAndAdd(this._acceleration, this._acceleration, f, 1 / this._mass);
    }
    get velocity() { return this._velocity; }
    ;
    set velocity(value) { this._velocity = value; }
    ;
    get acceleration() { return this._acceleration; }
    ;
    set acceleration(value) { this._acceleration = value; }
    ;
    get isColliding() { return this._timer > 0; }
    ;
    set isColliding(value) { if (value)
        this._timer = this._tolerance; }
}
