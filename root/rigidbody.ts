import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

export class Rigidbody {
    private _velocity: vec3 = vec3.create();
    private _acceleration: vec3 = vec3.create();
    private _gravity: vec3 = vec3.fromValues(0, -9.8, 0);
    private _isGrounded: boolean = false;
    private _mass: number = 1.0;
    private _drag: number = 0.5;

    public update(deltaTime: number, position: vec3): void {
        if(!this._isGrounded) vec3.scaleAndAdd(this._acceleration, this._acceleration, this._gravity, deltaTime);

        const deltaVelocity = vec3.create();
        vec3.scale(deltaVelocity, this._velocity, deltaTime);
        vec3.add(position, position, deltaVelocity);
        vec3.scale(this._velocity, this._velocity, 1 - (this._drag * deltaTime));
        vec3.set(this._acceleration, 0, 0, 0);
    }

    public addForce(f: vec3): void {
        vec3.scaleAndAdd(this._acceleration, this._acceleration, f, 1 / this._mass);
    }

    public get velocity(): vec3 { return this._velocity };
    public set velocity(value: vec3) { this._velocity = value };
    public get isGrounded(): boolean { return this._isGrounded };
    public set isGrounded(value: boolean) { this._isGrounded = value };
}