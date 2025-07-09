import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

import { Tick } from "./tick.js";
import { PlayerController } from "./player/player-controller.js";
import { ArmController } from "./player/arm-controller.js";
import { Hud } from "./hud.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";

export class Camera {
    private tick: Tick;
    private device: GPUDevice;
    private pipeline: GPURenderPipeline;

    private loader: Loader;
    private shaderLoader: ShaderLoader

    private viewMatrix: mat4;
    private projectionMatrix: mat4;
    private _fov: number = 110;

    public playerController: PlayerController;
    private armController: ArmController;
    private hud!: Hud;
    
    constructor(
        tick: Tick,
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        loader: Loader,
        shaderLoader: ShaderLoader,
        playerController: PlayerController
    ) {
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

    public getViewMatrixWithoutProjection(): mat4 {
        const cameraPos = this.playerController.getCameraPosition();
        const target = vec3.create();
        vec3.add(target, cameraPos, this.playerController.getForward());
        const viewMatrix = mat4.create();

        mat4.lookAt(
            viewMatrix,
            cameraPos,
            target,
            this.playerController.getUp()
        );

        return viewMatrix;
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

    //Arm
    public async renderArm(
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        passEncoder: GPURenderPassEncoder,
        canvas: HTMLCanvasElement
    ): Promise<void> {
        const projectionMatrix = this.getProjectionMatrix(canvas.width / canvas.height);
        passEncoder.setPipeline(pipeline);

        await this.armController.render(
            device, 
            pipeline, 
            passEncoder, 
            this, 
            projectionMatrix,
        );
    }

    public async initArm(device: GPUDevice, pipeline: GPURenderPipeline): Promise<void> {
        await this.armController.init(device, pipeline);
    }

    //Hud
    public async renderHud(passEncoder: GPURenderPassEncoder): Promise<void> {
        await this.hud.render(passEncoder);
    }

    public getHud(): Hud {
        return this.hud;
    }

    public update(deltaTime: number): void {
        const time = this.tick.getTimeScale() * deltaTime;
        const velocity = this.playerController.getVelocity();
        const isMoving = vec3.length(velocity) > 0.1;
        this.armController.update(time, isMoving);
    }
}