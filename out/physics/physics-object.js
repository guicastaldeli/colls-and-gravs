import { mat3, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { BoxCollider } from "../collision/collider.js";
export class PhysicsObject {
    position;
    velocity = vec3.create();
    isStatic = false;
    mass = 1.0;
    restitution = 0.1;
    collider;
    isSleeping = false;
    sleepTimer = 0.0;
    sleepThreshold = 0.05;
    sleepDelay = 2.0;
    inertiaTensor = mat3.create();
    torque = vec3.create();
    angularVelocity = vec3.create();
    orientation = quat.create();
    friction = 0.5;
    rollingFriction = 0.05;
    isOnGround = false;
    groundCheckTimer = 0.0;
    groundCheckInterval = 0.1;
    com = vec3.fromValues(0, 0.1, 0);
    baseWidth = 1.0;
    tiltTime = 0;
    maxTiltTime = 1.0;
    isStable = true;
    lastUnstableTime = 0.0;
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
        else {
            this.sleepTimer = 0.0;
        }
    }
    calculateSupportPolygon(groundLevel) {
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
        const threshold = 0.3;
        const supportedPoints = points.map(p => {
            const world = vec3.create();
            vec3.transformQuat(world, p, this.orientation);
            vec3.add(world, world, this.position);
            return world;
        }).filter(p => Math.abs(p[1] - groundLevel) < threshold);
        this.isOnGround = supportedPoints.length > 0;
        return supportedPoints;
    }
    calculateInertiaTensor() {
        const size = this.collider.getSize();
        const width = size[0] * 5;
        const height = size[1] * 5;
        const depth = size[2] * 5;
        const Ixx = (this.mass / 12) * (height * height + depth * depth);
        const Iyy = (this.mass / 12) * (width * width + depth * depth);
        const Izz = (this.mass / 12) * (width * width + height * height);
        mat3.set(this.inertiaTensor, Ixx, 0, 0, 0, Iyy, 0, 0, 0, Izz);
    }
    applyTorque(torque) {
        vec3.add(this.torque, this.torque, torque);
    }
    checkGroundContact(level, sizeY) {
        const halfHeight = sizeY / 2.0;
        const bottom = this.position[1] - halfHeight;
        this.isOnGround = bottom <= level + 0.05;
        if (this.isOnGround && bottom < level) {
            this.position[1] = level + sizeY / 2;
            this.velocity[1] = 0.0;
            if (vec3.length(this.angularVelocity) > 0.1)
                vec3.scale(this.angularVelocity, this.angularVelocity, 0.8);
        }
        return this.isOnGround;
    }
    updateRotation(deltaTime, groundLevel, y) {
        if (this.isStatic)
            return;
        this.groundCheckTimer += deltaTime;
        if (this.groundCheckTimer >= this.groundCheckInterval) {
            const bottom = this.position[1] - (y / 2);
            this.isOnGround = bottom <= groundLevel + 0.1;
            this.groundCheckTimer = 0.0;
        }
        if (vec3.length(this.torque) > 0.001) {
            const invInertia = mat3.create();
            mat3.invert(invInertia, this.inertiaTensor);
            const angularAcceleration = vec3.create();
            vec3.transformMat3(angularAcceleration, this.torque, invInertia);
            const airMultiplier = this.isOnGround ? 1.0 : 1.5;
            vec3.scaleAndAdd(this.angularVelocity, this.angularVelocity, angularAcceleration, deltaTime * airMultiplier);
        }
        const dampingFactor = this.isOnGround ?
            (1 - (this.rollingFriction * deltaTime)) :
            (1 - (this.rollingFriction * deltaTime * 0.3));
        vec3.scale(this.angularVelocity, this.angularVelocity, dampingFactor);
        if (vec3.length(this.angularVelocity) > 0.001) {
            const angle = vec3.length(this.angularVelocity) * deltaTime;
            const axis = vec3.normalize(vec3.create(), this.angularVelocity);
            const rotation = quat.setAxisAngle(quat.create(), axis, angle);
            quat.multiply(this.orientation, this.orientation, rotation);
            quat.normalize(this.orientation, this.orientation);
        }
        const up = vec3.fromValues(0, 1, 0);
        const blockUp = vec3.transformQuat(vec3.create(), up, this.orientation);
        const tiltAngle = Math.acos(vec3.dot(up, blockUp));
        if (tiltAngle >= this.maxTiltTime) {
            return;
        }
        else {
            this.tiltTime = 0;
            this.isStable = true;
        }
        if (this.collider instanceof BoxCollider)
            this.collider._orientation = this.orientation;
        vec3.set(this.torque, 0, 0, 0);
    }
}
