import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { PlayerController } from "./player-controller.js";

export class Camera {
    private viewMatrix: mat4;
    private projectionMatrix: mat4;
    private _fov: number = 110;

    private playerController: PlayerController;
    
    constructor(playerController: PlayerController) {
        this.playerController = playerController;
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
    }

    public getViewMatrix(): mat4 {
        this.playerController = this.playerController;

        const cameraPos = this.playerController.getCameraPosition();
        const target = vec3.create();
        vec3.add(target, cameraPos, this.playerController.getForward());
        
        mat4.lookAt(
            this.viewMatrix,
            cameraPos,
            target,
            this.playerController.getUp()
        );

        return this.viewMatrix;
    }

    public getProjectionMatrix(aspectRatio: number): mat4 {
        mat4.perspective(this.projectionMatrix, this._fov * Math.PI / 180, aspectRatio, 0.1, 100.0);
        return this.projectionMatrix;
    }
}