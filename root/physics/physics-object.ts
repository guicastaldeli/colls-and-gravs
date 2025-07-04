import { mat3, mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { Collider, ICollidable } from "../collider.js";

export class PhysicsObject implements ICollidable {
    public position: vec3;
    public velocity: vec3 = vec3.create();

    public isStatic: boolean = false;
    public mass: number = 1.0;
    public restitution: number = 0.5;
    public collider: Collider;

    public isSleeping: boolean = false;
    private sleepTimer: number = 0.0;
    private sleepThreshold: number = 0.5;
    private sleepDelay: number = 2.0;

    public inertiaTensor: mat3 = mat3.create();
    public torque: vec3 = vec3.create();
    public angularVelocity: vec3 = vec3.create();
    public orientation: quat = quat.create();
    public friction: number = 0.5;
    public rollingFriction: number = 0.5;

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
        this.calculateInertiaTensor();
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

    private calculateInertiaTensor(): void {
        const size = this.collider.getSize();
        const width = size[0] * 2;
        const height = size[1] * 2;
        const depth = size[2] * 2;

        const Ixx = (this.mass / 12) * (height * height + depth * depth);
        const Iyy = (this.mass / 12) * (width * width + depth * depth);
        const Izz = (this.mass / 12) * (width * width + height * height);

        mat3.set(this.inertiaTensor,
            Ixx, 0, 0,
            0, Iyy, 0,
            0, 0, Izz
        );
    }

    public applyTorque(torque: vec3): void {
        vec3.add(this.torque, this.torque, torque);
    }

    public updateRotation(deltaTime: number): void {
        if(this.isStatic) return;

        if(vec3.length(this.torque) > 0.001) {
            const invInertia = mat3.create();
            mat3.invert(invInertia, this.inertiaTensor);

            const angularAcceleration = vec3.create();
            vec3.transformMat3(angularAcceleration, this.torque, invInertia);
            vec3.scaleAndAdd(this.angularVelocity, this.angularVelocity, angularAcceleration, deltaTime);
        }

        vec3.scale(this.angularVelocity, this.angularVelocity, 1 - (this.rollingFriction * deltaTime));

        if(vec3.length(this.angularVelocity) > 0.001) {
            const angle = vec3.length(this.angularVelocity) * deltaTime;
            const axis = vec3.normalize(vec3.create(), this.angularVelocity);
            const rotation = quat.setAxisAngle(quat.create(), axis, angle);
            quat.multiply(this.orientation, this.orientation, rotation);
            quat.normalize(this.orientation, this.orientation);
        }

        vec3.set(this.torque, 0, 0, 0);
    }
}