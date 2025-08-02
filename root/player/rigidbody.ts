import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class Rigidbody {
    private _velocity: vec3 = vec3.create();
    private _acceleration: vec3 = vec3.create();
    private _isColliding: boolean = false;
    private _gravity: vec3 = vec3.fromValues(0.0, -20.0, 0.0);
    private _mass: number = 1.0;
    private _drag: number = 1.5;

    private _timer: number = 0.0;
    private _tolerance: number = 0.5;

    public update(deltaTime: number, position: vec3): void {
        deltaTime = Math.min(deltaTime, 0.1);

        if(!this._isColliding) this._timer = Math.max(0, this._timer - deltaTime);
        if(this._timer <= 0) vec3.scaleAndAdd(this._acceleration, this._acceleration, this._gravity, deltaTime);
        vec3.scaleAndAdd(this._velocity, this._velocity, this._acceleration, deltaTime);

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

    public get acceleration(): vec3 { return this._acceleration };
    public set acceleration(value: vec3) { this._acceleration = value };
    
    public get isColliding(): boolean { return this._timer > 0 };
    public set isColliding(value: boolean) { if(value) this._timer = this._tolerance; }
}