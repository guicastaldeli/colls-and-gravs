import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

export class Camera {
    private _position: vec3 = vec3.fromValues(0, 0, 3);
    private _forward: vec3 = vec3.fromValues(0, 0, -1);
    private _up: vec3 = vec3.fromValues(0, 1, 0);
    private _right: vec3;
    private _worldUp: vec3 = vec3.fromValues(0, 1, 0);

    private yaw: number = -90;
    private pitch: number = 0;
    
    private _movSpeed: number = 2.5;
    private _mouseSensv: number = 0.1;
    
    private viewMatrix: mat4;
    private projectionMatrix: mat4;
    private _fov: number = 90;
    
    constructor(
        _position?: vec3,
        _forward?: vec3,
        _up?: vec3,
        yaw?: number,
        pitch?: number
    ) {
        this._position = _position ? vec3.clone(_position) : this._position;
        this._forward = _forward ? vec3.clone(this._forward) : this._forward;
        this._up = _up ? vec3.clone(_up) : this._up;
        this._right = vec3.create();
        this._worldUp = _up ? vec3.clone(_up) : this._worldUp;
        
        this.yaw = yaw !== undefined ? yaw : this.yaw;
        this.pitch = pitch !== undefined ? pitch : this.pitch;

        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();

        this.updateCameraVectors();
    }

    private updateCameraVectors(): void {
        const forward = vec3.create();
        forward[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        forward[1] = Math.sin(this.pitch * Math.PI / 180);
        forward[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);

        vec3.normalize(this._forward, forward);
        vec3.cross(this._right, this._forward, this._worldUp);
        vec3.normalize(this._right, this._right);
        vec3.cross(this._up, this._right, this._forward);
        vec3.normalize(this._up, this._up);
    }

    public getViewMatrix(): mat4 {
        const target = vec3.create();
        vec3.add(target, this._position, this._forward);
        mat4.lookAt(this.viewMatrix, this._position, target, this._up);
        return this.viewMatrix;
    }

    public getProjectionMatrix(aspectRatio: number): mat4 {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }

    public setKeyboard(direction: string, deltaTime: number): void {
        const velocity = this._movSpeed * deltaTime;

        if(direction === 'FORWARD') vec3.scaleAndAdd(this._position, this._position, this._forward, velocity);
        if(direction === 'BACKWARD') vec3.scaleAndAdd(this._position, this._position, this._forward, -velocity);
        if(direction === 'LEFT') vec3.scaleAndAdd(this._position, this._position, this._right, -velocity);
        if(direction === 'RIGHT') vec3.scaleAndAdd(this._position, this._position, this._right, velocity);

        console.log(direction);
    }

    public setMouseMove(
        xOffset: number,
        yOffset: number,
        constrainPitch: boolean = true
    ): void {
        xOffset *= this._mouseSensv;
        yOffset *= this._mouseSensv;

        this.yaw += xOffset;
        this.pitch += yOffset;

        if(constrainPitch) {
            if(this.pitch > 89.0) this.pitch = 89.0;
            if(this.pitch < -89.0) this.pitch = -89.0;
        }

        this.updateCameraVectors();
    }

    public getPosition(): vec3 { return this._position; }
    public getForward(): vec3 { return this._forward; }
}