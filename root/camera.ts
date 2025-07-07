import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { PlayerController } from "./player/player-controller.js";

import { Hud } from "./hud.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";

export class Camera {
    private device: GPUDevice;
    private pipeline: GPURenderPipeline;

    private loader: Loader;
    private shaderLoader: ShaderLoader

    private viewMatrix: mat4;
    private projectionMatrix: mat4;
    private _fov: number = 110;

    private playerController: PlayerController;
    private hud!: Hud;
    
    constructor(
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        loader: Loader,
        shaderLoader: ShaderLoader,
        playerController: PlayerController
    ) {
        this.device = device;
        this.pipeline = pipeline;

        this.loader = loader;
        this.shaderLoader = shaderLoader;

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

    public async initHud(w: number, h: number): Promise<void> {
        this.hud = new Hud(
            this.device, 
            this.pipeline,
            this.loader, 
            this.shaderLoader
        );

        await this.hud.update(w, h);
        await this.hud.init(w, h);
    }

    public async renderHud(passEncoder: GPURenderPassEncoder): Promise<void> {
        await this.hud.render(passEncoder);
    }

    public getHud(): Hud {
        return this.hud;
    }
}