import { mat3, mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { Collider, ICollidable } from "../collider.js";

export class PhysicsObject implements ICollidable {
    public position: vec3;
    public velocity: vec3 = vec3.create();
    public angularVelocity: vec3 = vec3.create();
    public orientation: quat = quat.create();

    public isStatic: boolean = false;
    public mass: number = 1.0;
    public restitution: number = 0.1;
    public collider: Collider;

    public isSleeping: boolean = false;
    private sleepTimer: number = 0.0;
    private sleepThreshold: number = 0.1;
    private sleepDelay: number = 2.0;

    constructor(
        position: vec3,
        velocity: vec3,
        angularVelocity: vec3,
        collider: Collider,
    ) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.angularVelocity = vec3.clone(angularVelocity);
        this.collider = collider;
    }

    public getPosition(): vec3 {
        return this.position;
    }

    public getCollider(): Collider {
        return this.collider;
    }

    public checkSleep(deltaTime: number): void {
        if(this.isStatic) return;

        const velocitySq = vec3.squaredLength(this.velocity);
        const angularVelocitySq = vec3.squaredLength(this.angularVelocity);

        if(velocitySq < this.sleepThreshold * this.sleepThreshold &&
            angularVelocitySq < this.sleepThreshold * this.sleepThreshold
        ) {
            this.sleepTimer += deltaTime;

            if(this.sleepTimer >= this.sleepDelay) {
                this.isSleeping = true;
                vec3.set(this.velocity, 0, 0, 0);
                vec3.set(this.angularVelocity, 0, 0, 0);
            }
        }
    }

    public updateRotation(deltaTime: number): void {
        if(vec3.length(this.angularVelocity) > 0) {
            const rotation = quat.setAxisAngle(
                quat.create(),
                this.angularVelocity,
                vec3.length(this.angularVelocity) * deltaTime
            );

            quat.multiply(this.orientation, rotation, this.orientation);
            vec3.scale(this.angularVelocity, this.angularVelocity, 0.99);
        }
    }
}