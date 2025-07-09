import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { Tick } from "../tick.js";

export class ArmController {
    private tick: Tick;

    private _initialPosition: vec3;
    private _position: vec3 = vec3.fromValues(0, 3, 0);
    private _forward: vec3 = vec3.fromValues(0, 0, -1);
    private _up: vec3 = vec3.fromValues(0, 1, 0);
    private _right: vec3;
    private _jumpForce: number = 20.0;
    
    private _worldUp: vec3 = vec3.fromValues(0, 1, 0);
    private _cameraOffset: vec3 = vec3.fromValues(0, 0, 0);
    
    private yaw: number = 0;
    private pitch: number = 0;
        
    private _movSpeed: number = 5.0;
    private _mouseSensv: number = 0.3;

    //Movement
    private _isMoving: boolean = true;
    private _movementTimer: number = 0.0;
    private _bobIntensity: number = 0.3;
    private _bobSpeed: number = 40.0;
    private _bobOffset: vec3 = vec3.create();

    constructor(
        tick: Tick,
        _initialPosition?: vec3, 
     ) {
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