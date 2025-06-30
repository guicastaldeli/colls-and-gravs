import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class Camera {
    _position = vec3.fromValues(0, 0, 3);
    _forward = vec3.fromValues(0, 0, -1);
    _up = vec3.fromValues(0, 1, 0);
    _right;
    _worldUp;
    yaw = -90;
    pitch = 0;
    _movSpeed = 2.5;
    _mouseSensv = 0.1;
    viewMatrix;
    projectionMatrix;
    _fov = 90;
    constructor(_position, _forward, _up, yaw, pitch) {
        this._position = _position || vec3.fromValues(0, 0, 0);
        this._worldUp = _up || vec3.fromValues(0, 0, 0);
        this.yaw = yaw || 0;
        this.pitch = pitch || 0;
        this._forward = _forward || vec3.fromValues(0, 0, 0);
        this._right = vec3.create();
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.updateCameraVectors();
    }
    updateCameraVectors() {
        const forward = vec3.create();
        forward[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        forward[1] = Math.sin(this.pitch * Math.PI / 180);
        forward[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        vec3.normalize(this._forward, forward);
        vec3.normalize(this._forward, vec3.cross(vec3.create(), this._forward, this._worldUp));
        vec3.normalize(this._up, vec3.cross(vec3.create(), this._right, this._forward));
    }
    getViewMatrix() {
        const target = vec3.create();
        vec3.add(target, this._position, this._forward);
        mat4.lookAt(this.viewMatrix, this._position, target, this._up);
        return this.viewMatrix;
    }
    getProjectionMatrix(aspectRatio) {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }
    setKeyboard(direction, deltaTime) {
        const velocity = this._movSpeed * deltaTime;
        if (direction === 'FORWARD')
            vec3.scaleAndAdd(this._position, this._position, this._forward, velocity);
        if (direction === 'BACKWARD')
            vec3.scaleAndAdd(this._position, this._position, this._forward, -velocity);
        if (direction === 'LEFT')
            vec3.scaleAndAdd(this._position, this._position, this._right, -velocity);
        if (direction === 'RIGHT')
            vec3.scaleAndAdd(this._position, this._position, this._right, velocity);
    }
    setMouseMove(xOffset, yOffset, constrainPitch = true) {
        xOffset *= this._mouseSensv;
        yOffset *= this._mouseSensv;
        this.yaw += xOffset;
        this.pitch += yOffset;
        if (constrainPitch) {
            if (this.pitch > 89.0)
                this.pitch = 89.0;
            if (this.pitch < -89.0)
                this.pitch = -89.0;
        }
        this.updateCameraVectors();
    }
    getPosition() { return this._position; }
    getForward() { return this._forward; }
}
