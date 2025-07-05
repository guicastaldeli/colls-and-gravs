import { mat3, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
export class PhysicsObject {
    position;
    velocity = vec3.create();
    isStatic = false;
    mass = 1.0;
    restitution = 0.5;
    collider;
    isSleeping = false;
    sleepTimer = 0.0;
    sleepThreshold = 0.5;
    sleepDelay = 2.0;
    inertiaTensor = mat3.create();
    torque = vec3.create();
    angularVelocity = vec3.create();
    orientation = quat.create();
    friction = 0.5;
    rollingFriction = 0.5;
    constructor(position, velocity, angularVelocity, collider) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.angularVelocity = vec3.clone(angularVelocity);
        this.collider = collider;
        this.calculateInertiaTensor();
    }
    getPosition() {
        return this.position;
    }
    getCollider() {
        return this.collider;
    }
    checkSleep(deltaTime) {
        if (this.isStatic)
            return;
        const velocitySq = vec3.squaredLength(this.velocity);
        const angularVelocitySq = vec3.squaredLength(this.angularVelocity);
        if (velocitySq < this.sleepThreshold * this.sleepThreshold &&
            angularVelocitySq < this.sleepThreshold * this.sleepThreshold) {
            this.sleepTimer += deltaTime;
            if (this.sleepTimer >= this.sleepDelay) {
                this.isSleeping = true;
                vec3.set(this.velocity, 0, 0, 0);
                vec3.set(this.angularVelocity, 0, 0, 0);
            }
        }
    }
    calculateInertiaTensor() {
        const size = this.collider.getSize();
        const width = size[0] * 2;
        const height = size[1] * 2;
        const depth = size[2] * 2;
        const Ixx = (this.mass / 12) * (height * height + depth * depth);
        const Iyy = (this.mass / 12) * (width * width + depth * depth);
        const Izz = (this.mass / 12) * (width * width + height * height);
        mat3.set(this.inertiaTensor, Ixx, 0, 0, 0, Iyy, 0, 0, 0, Izz);
    }
    applyTorque(torque) {
        vec3.add(this.torque, this.torque, torque);
    }
    updateRotation(deltaTime) {
        if (this.isStatic)
            return;
        if (vec3.length(this.torque) > 0.001) {
            const invInertia = mat3.create();
            mat3.invert(invInertia, this.inertiaTensor);
            const angularAcceleration = vec3.create();
            vec3.transformMat3(angularAcceleration, this.torque, invInertia);
            vec3.scaleAndAdd(this.angularVelocity, this.angularVelocity, angularAcceleration, deltaTime);
        }
        vec3.scale(this.angularVelocity, this.angularVelocity, 1 - (this.rollingFriction * deltaTime));
        if (vec3.length(this.angularVelocity) > 0.001) {
            const angle = vec3.length(this.angularVelocity) * deltaTime;
            const axis = vec3.normalize(vec3.create(), this.angularVelocity);
            const rotation = quat.setAxisAngle(quat.create(), axis, angle);
            quat.multiply(this.orientation, this.orientation, rotation);
            quat.normalize(this.orientation, this.orientation);
        }
        vec3.set(this.torque, 0, 0, 0);
    }
}
