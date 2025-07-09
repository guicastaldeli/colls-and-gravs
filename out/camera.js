import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { ArmController } from "./player/arm-controller.js";
import { Hud } from "./hud.js";
export class Camera {
    tick;
    device;
    pipeline;
    loader;
    shaderLoader;
    viewMatrix;
    projectionMatrix;
    _fov = 110;
    playerController;
    armController;
    hud;
    constructor(tick, device, pipeline, loader, shaderLoader, playerController) {
        this.tick = tick;
        this.device = device;
        this.pipeline = pipeline;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.playerController = playerController;
        this.armController = new ArmController(tick, loader);
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
        const target = vec3.create();
        vec3.add(target, cameraPos, this.playerController.getForward());
        const viewMatrix = mat4.create();
        mat4.lookAt(viewMatrix, cameraPos, target, this.playerController.getUp());
        return viewMatrix;
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
        const isMoving = velocityMagnitude > 0.1;
        this.armController.update(scaledDeltaTime, isMoving, velocityMagnitude);
    }
}
