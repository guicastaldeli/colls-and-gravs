import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { ArmController } from "./player/arm-controller.js";
import { Hud } from "./hud.js";
export class Camera {
    tick;
    device;
    pipeline;
    loader;
    shaderLoader;
    lightningManager;
    viewMatrix;
    projectionMatrix;
    _fov = 110;
    playerController;
    armController;
    hud;
    constructor(tick, device, pipeline, loader, shaderLoader, playerController, lightningManager, weaponBase) {
        this.tick = tick;
        this.device = device;
        this.pipeline = pipeline;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.lightningManager = lightningManager;
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.playerController = playerController;
        this.armController = new ArmController(tick, loader, lightningManager, weaponBase);
    }
    getViewMatrix() {
        this.playerController = this.playerController;
        const cameraPos = this.playerController.getCameraPosition();
        const target = vec3.create();
        vec3.add(target, cameraPos, this.playerController.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.playerController.getUp());
        return this.viewMatrix;
    }
    getProjectionMatrix(aspectRatio) {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }
    getViewMatrixWithoutProjection() {
        const cameraPos = this.playerController.getCameraPosition();
        const bobOffset = this.playerController.getBobOffset();
        vec3.add(cameraPos, cameraPos, bobOffset);
        const target = vec3.create();
        vec3.add(target, cameraPos, this.playerController.getForward());
        mat4.lookAt(this.viewMatrix, cameraPos, target, this.playerController.getUp());
        return this.viewMatrix;
    }
    async initHud(w, h) {
        this.hud = new Hud(this.device, this.pipeline, this.loader, this.shaderLoader);
        await this.hud.update(w, h);
        await this.hud.init(w, h);
    }
    //Arm
    async renderArm(device, pipeline, passEncoder, canvas) {
        const projectionMatrix = this.getProjectionMatrix(canvas.width / canvas.height);
        passEncoder.setPipeline(pipeline);
        await this.armController.render(device, pipeline, passEncoder, this, projectionMatrix);
    }
    async initArm(device, pipeline) {
        await this.armController.init(device, pipeline);
    }
    //Hud
    async renderHud(passEncoder) {
        await this.hud.render(passEncoder);
    }
    getHud() {
        return this.hud;
    }
    update(deltaTime) {
        const scaledDeltaTime = this.tick.getTimeScale() * deltaTime;
        const velocity = this.playerController.getVelocity();
        const velocityMagnitude = vec3.length(velocity);
        const isMoving = this.playerController._isMoving;
        const isJumping = this.playerController.isJumping();
        this.armController.update(scaledDeltaTime, isMoving, velocityMagnitude, isJumping, this);
    }
}
