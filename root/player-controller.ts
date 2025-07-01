import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

export class PlayerController {
    private _initialPosition: vec3;
    private _position: vec3 = vec3.fromValues(0, 0, 3);
    private _forward: vec3 = vec3.fromValues(0, 0, -1);
    private _up: vec3 = vec3.fromValues(0, 1, 0);
    private _right: vec3;
    private _worldUp: vec3 = vec3.fromValues(0, 1, 0);
    private _cameraOffset: vec3 = vec3.fromValues(0, 0, 0);
    
    private yaw: number = -90;
    private pitch: number = 0;
        
    private _movSpeed: number = 2.5;
    private _mouseSensv: number = 0.3;
        
    constructor(_initialPosition?: vec3) {
        this._position = this._initialPosition ? vec3.clone(this._initialPosition) : this._position;
        this._forward = this._forward ? vec3.clone(this._forward) : this._forward;
        this._worldUp = this._worldUp ? vec3.clone(this._worldUp) : this._worldUp;
        this._up = this._up ? vec3.clone(this._worldUp) : this._up;
        this._right = vec3.create();
        this.updateVectors();
    }
    
    private updateVectors(): void {
        this._forward[0] = Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
        this._forward[1] = Math.sin(this.pitch * Math.PI / 180);
        this._forward[2] = Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180);
    
        vec3.normalize(this._forward, this._forward);
        vec3.cross(this._right, this._forward, this._worldUp);
        vec3.normalize(this._right, this._right);
        vec3.cross(this._up, this._right, this._forward);
        vec3.normalize(this._up, this._up);
    } 
    
    public getCameraPosition(): vec3 {
        const cameraPos = vec3.create();
        vec3.add(cameraPos, this._position, this._cameraOffset);
        return cameraPos;
    }

    public setKeyboard(direction: string, deltaTime: number): void {
        const velocity = this._movSpeed * deltaTime;
    
        if(direction === 'FORWARD') {
            const forwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(forwardXZ, forwardXZ);
            vec3.scaleAndAdd(this._position, this._position, forwardXZ, velocity);
        }
        if(direction === 'BACKWARD') {
            const forwardXZ = vec3.fromValues(this._forward[0], 0, this._forward[2]);
            vec3.normalize(forwardXZ, forwardXZ);
            vec3.scaleAndAdd(this._position, this._position, forwardXZ, -velocity);
        }
        if(direction === 'LEFT') {
            const rightXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(rightXZ, rightXZ);
            vec3.scaleAndAdd(this._position, this._position, rightXZ, -velocity);
        }
        if(direction === 'RIGHT') {
            const rightXZ = vec3.fromValues(this._right[0], 0, this._right[2]);
            vec3.normalize(rightXZ, rightXZ);
            vec3.scaleAndAdd(this._position, this._position, rightXZ, velocity);
        }
        if(direction === 'UP') vec3.scaleAndAdd(this._position, this._position, this._worldUp, velocity);
        if(direction === 'DOWN') vec3.scaleAndAdd(this._position, this._position, this._worldUp, -velocity);
    }

    public updateInput(
        keys: Record<string, boolean>,
        deltaTime: number,
    ): void {
        for(const key in keys) {
            if(keys[key]) {
                switch(key.toLowerCase()) {
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
        };
    }

    public updateRotation(xOffset: number, yOffset: number): void {
        xOffset *= this._mouseSensv;
        yOffset *= this._mouseSensv;

        this.yaw += xOffset;
        this.pitch += yOffset;

        if(this.pitch > 89.0) this.pitch = 89.0;
        if(this.pitch < -89.0) this.pitch = -89.0;
        this.updateVectors();
    }
    
    public getForward(): vec3 { return this._forward; }
    public getPosition(): vec3 { return this._position; }
    public getUp(): vec3 { return this._up; }
    public getRight(): vec3 { return this._right; }
}