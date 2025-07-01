import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { Rigidbody } from "./rigidbody.js";
import { BoxCollider } from "./collider.js";
export class PlayerController {
    _initialPosition;
    _position = vec3.fromValues(0, 5, 0);
    _forward = vec3.fromValues(0, 0, -1);
    _up = vec3.fromValues(0, 1, 0);
    _right;
    _jumpForce = 20.0;
    _worldUp = vec3.fromValues(0, 1, 0);
    _cameraOffset = vec3.fromValues(0, 0, 0);
    yaw = -90;
    pitch = 0;
    _movSpeed = 5.0;
    _mouseSensv = 0.3;
    _Rigidbody;
    _Collider;
    _Collidables = [];
    constructor(_initialPosition, collidables) {
        this._position = this._initialPosition ? vec3.clone(this._initialPosition) : this._position;
        this._forward = this._forward ? vec3.clone(this._forward) : this._forward;
        this._worldUp = this._worldUp ? vec3.clone(this._worldUp) : this._worldUp;
        this._up = this._up ? vec3.clone(this._worldUp) : this._up;
        this._right = vec3.create();
        this.updateVectors();
        this.initJump();
        this._Rigidbody = new Rigidbody();
        this._Collider = new BoxCollider([0.5, 0.0, 0.4]);
        if (collidables)
            this._Collidables = collidables;
    }
    updateVectors() {
        this._forward[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        this._forward[1] = Math.sin(this.pitch * Math.PI / 180);
        this._forward[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        vec3.normalize(this._forward, this._forward);
        vec3.cross(this._right, this._forward, this._worldUp);
        vec3.normalize(this._right, this._right);
        vec3.cross(this._up, this._right, this._forward);
        vec3.normalize(this._up, this._up);
    }
    getCameraPosition() {
        const cameraPos = vec3.create();
        vec3.add(cameraPos, this._position, this._cameraOffset);
        return cameraPos;
    }
    setKeyboard(direction, deltaTime) {
        const velocity = this._movSpeed * deltaTime;
        const force = vec3.create();
        if (direction === 'FORWARD') {
            const forwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(forwardXZ, forwardXZ);
            vec3.scaleAndAdd(force, force, forwardXZ, velocity * 10);
        }
        if (direction === 'BACKWARD') {
            const forwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(forwardXZ, forwardXZ);
            vec3.scaleAndAdd(force, force, forwardXZ, -velocity * 10);
        }
        if (direction === 'LEFT') {
            const rightXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(rightXZ, rightXZ);
            vec3.scaleAndAdd(force, force, rightXZ, -velocity * 10);
        }
        if (direction === 'RIGHT') {
            const rightXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(rightXZ, rightXZ);
            vec3.scaleAndAdd(force, force, rightXZ, velocity * 10);
        }
        if (direction === 'UP')
            this.jump();
        if (direction === 'DOWN')
            vec3.scaleAndAdd(this._position, this._position, this._worldUp, -velocity);
        this._Rigidbody.addForce(force);
    }
    updateInput(keys, deltaTime) {
        for (const key in keys) {
            if (key === ' ')
                continue;
            if (keys[key]) {
                switch (key.toLowerCase()) {
                    case 'w':
                        this.setKeyboard('FORWARD', deltaTime);
                        break;
                    case 's':
                        this.setKeyboard('BACKWARD', deltaTime);
                        break;
                    case 'a':
                        this.setKeyboard('LEFT', deltaTime);
                        break;
                    case 'd':
                        this.setKeyboard('RIGHT', deltaTime);
                        break;
                    case ' ':
                        this.setKeyboard('UP', deltaTime);
                        break;
                    case 'shift':
                        this.setKeyboard('DOWN', deltaTime);
                        break;
                }
            }
        }
        ;
    }
    jump() {
        if (this._Rigidbody.isColliding) {
            const force = vec3.fromValues(0, this._jumpForce, 0);
            this._Rigidbody.addForce(force);
        }
    }
    initJump() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat) {
                this.jump();
            }
        });
    }
    getPosition() {
        return this._position;
    }
    checkCollisions() {
        const box = this._Collider.getBoundingBox(this._position);
        for (const collidable of this._Collidables) {
            if (collidable === this)
                continue;
            const otherBox = collidable.getCollider().getBoundingBox(collidable.getPosition());
            if (this.checkAABBCollision(box, otherBox)) {
                this.resolveCollision(box, otherBox);
                if (collidable.onCollision)
                    collidable.onCollision(this);
                //if(this.onCollision) this.onCollision(collidable);
            }
        }
    }
    onCollision(other) {
        console.log(`Player collided with ${other.constructor.name}`);
    }
    getCollider() {
        return this._Collider;
    }
    addCollidable(collidable) {
        this._Collidables.push(collidable);
    }
    checkAABBCollision(a, b) {
        return (a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
            a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
            a.min[2] <= b.max[2] && a.max[2] >= b.min[2]);
    }
    resolveCollision(box, otherBox) {
        const overlaps = vec3.fromValues(Math.min(box.max[0], otherBox.max[0]) - Math.max(box.min[0], otherBox.min[0]), Math.min(box.max[1], otherBox.max[1]) - Math.max(box.min[1], otherBox.min[1]), Math.min(box.max[2], otherBox.max[2]) - Math.max(box.min[2], otherBox.min[2]));
        let minAxis = 0;
        for (let i = 1; i < 3; i++) {
            if (overlaps[i] < overlaps[minAxis]) {
                minAxis = i;
            }
        }
        const depth = overlaps[minAxis];
        const correction = vec3.create();
        const playerCenter = vec3.fromValues((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2);
        const otherCenter = vec3.fromValues((otherBox.min[0] + otherBox.max[0]) / 2, (otherBox.min[1] + otherBox.max[1]) / 2, (otherBox.min[2] + otherBox.max[2]) / 2);
        const direction = vec3.create();
        vec3.sub(direction, playerCenter, otherCenter);
        if (minAxis === 0) {
            correction[0] = (direction[0] > 0 ? depth : -depth) * 1.01;
            this._Rigidbody.velocity[0] = 0;
        }
        else if (minAxis === 1) {
            correction[1] = (direction[1] > 0 ? depth : -depth) * 1.01;
            this._Rigidbody.velocity[1] = 0;
            if (direction[1] > 0)
                this._Rigidbody.isColliding = true;
        }
        else {
            correction[2] = (direction[2] > 0 ? depth : -depth) * 1.01;
            this._Rigidbody.velocity[2] = 0;
        }
        vec3.add(this._position, this._position, correction);
    }
    removeCollidable(collidable) {
        const i = this._Collidables.indexOf(collidable);
        if (i !== -1)
            this._Collidables.splice(i, 1);
    }
    updateRotation(xOffset, yOffset) {
        xOffset *= this._mouseSensv;
        yOffset *= this._mouseSensv;
        this.yaw += xOffset;
        this.pitch += yOffset;
        if (this.pitch > 89.0)
            this.pitch = 89.0;
        if (this.pitch < -89.0)
            this.pitch = -89.0;
        this.updateVectors();
    }
    getForward() { return this._forward; }
    getUp() { return this._up; }
    getRight() { return this._right; }
    update(deltaTime) {
        this._Rigidbody.isColliding = false;
        this._Rigidbody.update(deltaTime, this._position);
        this.checkCollisions();
    }
}
