import { mat3, mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { Collider, ICollidable } from "../collision/collider.js";

export class PhysicsObject implements ICollidable {
    public position: vec3;
    public velocity: vec3 = vec3.create();

    public isStatic: boolean = false;
    public mass: number = 1.0;
    public restitution: number = 0.5;
    public collider: Collider;

    public isSleeping: boolean = false;
    private sleepTimer: number = 0.0;
    private sleepThreshold: number = 0.05;
    private sleepDelay: number = 2.0;

    public inertiaTensor: mat3 = mat3.create();
    public torque: vec3 = vec3.create();
    public angularVelocity: vec3 = vec3.create();
    public orientation: quat = quat.create();
    public friction: number = 0.5;
    public rollingFriction: number = 0.05;

    public isOnGround: boolean = false;
    public groundCheckTimer: number = 0.0;
    public groundCheckInterval: number = 0.1;

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

    public calculateSupportPolygon(groundLevel: number): vec3[] {
        const size = this.collider.getSize();
        const halfExtents = vec3.fromValues(size[0] / 2, size[1] / 2, size[2] / 2);

        const points = [
            vec3.fromValues(-halfExtents[0], -halfExtents[1], -halfExtents[2]),
            vec3.fromValues(0, -halfExtents[1], -halfExtents[2]),
            vec3.fromValues(halfExtents[0], -halfExtents[1], -halfExtents[2]),
            vec3.fromValues(-halfExtents[0], -halfExtents[1], 0),
            vec3.fromValues(0, -halfExtents[1], 0),
            vec3.fromValues(halfExtents[0], -halfExtents[1], 0),
            vec3.fromValues(-halfExtents[0], -halfExtents[1], halfExtents[2]),
            vec3.fromValues(0, -halfExtents[1], halfExtents[2]),
            vec3.fromValues(halfExtents[0], -halfExtents[1], halfExtents[2]),
        ];

        const worldPoints = points.map(p => {
            const world = vec3.create();
            vec3.transformQuat(world, p, this.orientation);
            vec3.add(world, world, this.position);
            return world;
        });

        const threshold = 0.1
        return worldPoints.filter(p => Math.abs(p[1] - groundLevel) < threshold);
    }

    private calculateInertiaTensor(): void {
        const size = this.collider.getSize();
        const width = size[0] * 5;
        const height = size[1] * 5;
        const depth = size[2] * 5;

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

    public checkGroundContact(level: number, sizeY: number): boolean {
        const halfHeight = sizeY / 2.0;
        const bottom = this.position[1] - halfHeight;
        this.isOnGround = bottom <= level + 0.01;
        return this.isOnGround;
    }

    public updateRotation(deltaTime: number, groundLevel: number, y: number): void {
        if(this.isStatic) return;
        
        this.groundCheckTimer += deltaTime;
        if(this.groundCheckTimer >= this.groundCheckInterval) {
            const bottom = this.position[1] - (y / 2);
            this.isOnGround = bottom <= groundLevel + 0.05;
            this.groundCheckTimer = 0.0;
        }

        if(vec3.length(this.torque) > 0.001) {
            const invInertia = mat3.create();
            mat3.invert(invInertia, this.inertiaTensor);

            const angularAcceleration = vec3.create();
            vec3.transformMat3(angularAcceleration, this.torque, invInertia);
            
            const airMultiplier = this.isOnGround ? 1.0 : 1.5;
            vec3.scaleAndAdd(
                this.angularVelocity,
                this.angularVelocity,
                angularAcceleration,
                deltaTime * airMultiplier
            );
        }

        const dampingFactor = this.isOnGround ?
        (1 - (this.rollingFriction * deltaTime)) :
        (1 - (this.rollingFriction * deltaTime * 0.3));
        vec3.scale(this.angularVelocity, this.angularVelocity, dampingFactor);

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