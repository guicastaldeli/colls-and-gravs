import { vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
export class PhysicsObject {
    position;
    velocity = vec3.create();
    angularVelocity = vec3.create();
    orientation = quat.create();
    isStatic = false;
    mass = 1.0;
    restitution = 0.1;
    collider;
    isSleeping = false;
    sleepTimer = 0.0;
    sleepThreshold = 0.1;
    sleepDelay = 2.0;
    constructor(position, velocity, angularVelocity, collider) {
        this.position = vec3.clone(position);
        this.velocity = vec3.clone(velocity);
        this.angularVelocity = vec3.clone(angularVelocity);
        this.collider = collider;
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
    updateRotation(deltaTime) {
        if (vec3.length(this.angularVelocity) > 0) {
            const rotation = quat.setAxisAngle(quat.create(), this.angularVelocity, vec3.length(this.angularVelocity) * deltaTime);
            quat.multiply(this.orientation, rotation, this.orientation);
            vec3.scale(this.angularVelocity, this.angularVelocity, 0.99);
        }
    }
}
