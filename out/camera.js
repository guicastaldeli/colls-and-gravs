import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { Hud } from "./hud.js";
export class Camera {
    device;
    pipeline;
    loader;
    shaderLoader;
    viewMatrix;
    projectionMatrix;
    _fov = 110;
    playerController;
    hud;
    constructor(device, pipeline, loader, shaderLoader, playerController) {
        this.device = device;
        this.pipeline = pipeline;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.playerController = playerController;
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
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
    async initHud() {
        this.hud = new Hud(this.device, this.pipeline, this.loader, this.shaderLoader);
        await this.hud.init();
    }
    async renderHud(passEncoder) {
        await this.hud.render(passEncoder);
    }
}
