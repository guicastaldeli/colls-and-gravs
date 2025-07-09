import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class ArmController {
    tick;
    _initialPosition;
    _position = vec3.fromValues(0, 3, 0);
    _forward = vec3.fromValues(0, 0, -1);
    _up = vec3.fromValues(0, 1, 0);
    _right;
    _jumpForce = 20.0;
    _worldUp = vec3.fromValues(0, 1, 0);
    _cameraOffset = vec3.fromValues(0, 0, 0);
    yaw = 0;
    pitch = 0;
    _movSpeed = 5.0;
    _mouseSensv = 0.3;
    //Movement
    _isMoving = true;
    _movementTimer = 0.0;
    _bobIntensity = 0.3;
    _bobSpeed = 40.0;
    _bobOffset = vec3.create();
    constructor(tick, _initialPosition) {
        this.tick = tick;
        this._position = this._initialPosition ? vec3.clone(this._initialPosition) : this._position;
        this._forward = this._forward ? vec3.clone(this._forward) : this._forward;
        this._worldUp = this._worldUp ? vec3.clone(this._worldUp) : this._worldUp;
        this._up = this._up ? vec3.clone(this._worldUp) : this._up;
        this._right = vec3.create();
        this.updateVectors();
        this.initJump();
    }
}
