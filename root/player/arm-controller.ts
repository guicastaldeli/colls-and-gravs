import { mat3, mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { Tick } from "../tick.js";
import { BufferData } from "./arm-buffer.js";
import { Loader } from "../loader.js";
import { drawBuffers, initBuffers } from "./arm-buffer.js";
import { Camera } from "../camera.js";
import { LightningManager } from "../lightning-manager.js";

export class ArmController {
    private tick: Tick;
    private lightningManager: LightningManager;

    private _position: vec3 = vec3.create();
    private _restPosition: vec3 = vec3.create();

    //Buffers
    public armBindGroup!: GPUBindGroup;
    public armUniformBuffer!: GPUBuffer;

    //Movement
    private _isMoving: boolean = true;
    private _movementTimer: number = 0.0;
    private _bobIntensity: number = 10.0;
    private _bobSpeed: number = 50.0;
    
    private _swayAmount: number = 15.0;
    private _currentSway: number = 0.0;
    private _targetSway: number = 0.0;
    private _smoothFactor: number = 20.0;

    //Rotation
    private _currentRotationX: number = 0.0;
    private _targetRotationX: number = 0.0;
    private _rotationSmoothFactor: number = 3.0;

    //Delay
    private _delayedForward: vec3 = vec3.create();
    private _delayedRight: vec3 = vec3.create();
    private _delayedUp: vec3 = vec3.create();
    private _delayFactor: number = 0.1;

    //Size
    private size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    //Pos
    private pos = {
        x: 0.5,
        y: -0.9,
        z: 0.5
    }

    //Model
    private loader: Loader;

    public armModel!: {
        vertex: GPUBuffer,
        color: GPUBuffer,
        index: GPUBuffer,
        indexCount: number,
        texture: GPUTexture,
        sampler: GPUSampler
    }

    constructor(
        tick: Tick,
        loader: Loader,
        lightningManager: LightningManager
    ) {
        this.tick = tick;
        this.loader = loader;
        this.lightningManager = lightningManager;
        this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
    }

    public async loadAssets(): Promise<void> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/player/arm.obj'),
                this.loader.textureLoader('./assets/player/arm.png')
            ]);

            this.armModel = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                texture: tex,
                sampler: this.loader.createSampler()
            }
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private setRestPosition(
        x: number,
        y: number,
        z: number
    ): void {
        vec3.set(this._restPosition, x, y, z);
        vec3.copy(this._position, this._restPosition);
    }

    public getModelMatrix(
        cameraPosition: vec3,
        cameraForward: vec3,
        cameraRight: vec3,
        cameraUp: vec3
    ): mat4 {
        vec3.lerp(this._delayedForward, this._delayedForward, cameraForward, this._delayFactor);
        vec3.lerp(this._delayedRight, this._delayedRight, cameraRight, this._delayFactor);
        vec3.lerp(this._delayedUp, this._delayedUp, cameraUp, this._delayFactor);

        const modelMatrix = mat4.create();

        const baseOffset = vec3.create();
        vec3.scaleAndAdd(baseOffset, baseOffset, this._delayedForward, this.pos.z);

        const rightOffset = vec3.create();
        vec3.scale(rightOffset, this._delayedRight, this.pos.x);

        const upOffset = vec3.create();
        vec3.scale(upOffset, this._delayedUp, this.pos.y);

        const finalPosition = vec3.create();
        vec3.add(finalPosition, cameraPosition, baseOffset);
        vec3.add(finalPosition, finalPosition, rightOffset);
        vec3.add(finalPosition, finalPosition, upOffset);
        mat4.translate(modelMatrix, modelMatrix, finalPosition);

        const rotationMatrix = mat4.create();
        const cameraMatrix = mat4.create();
        mat4.set(
            cameraMatrix,
            cameraRight[0], cameraRight[1], cameraRight[2], 0,
            cameraUp[0], cameraUp[1], cameraUp[2], 0,
            -cameraForward[0], -cameraForward[1], -cameraForward[2], 0,
            0.01, -0.1, -0.1, 1.0
        )

        const baseRotation = mat4.create();
        mat4.rotateX(baseRotation, baseRotation, this._currentRotationX * Math.PI / 180);
        mat4.rotateY(baseRotation, baseRotation, 90 * -Math.PI / 180);
        mat4.rotateZ(baseRotation, baseRotation, 0);
        
        mat4.multiply(rotationMatrix, cameraMatrix, baseRotation);
        mat4.multiply(modelMatrix, modelMatrix, rotationMatrix);
        
        mat4.scale(
            modelMatrix,
            modelMatrix,
            [
                this.size.w,
                this.size.h,
                this.size.d
            ]
        );

        return modelMatrix;
    }

    private updateBobPosition(deltaTime: number): void {
        if(this._isMoving) {
            this._movementTimer += deltaTime *  this._bobSpeed;
            const bobX = Math.sin(this._movementTimer * 0.5) * this._bobIntensity;
            const bobY = Math.sin(this._movementTimer) * this._bobIntensity;

            this._position[0] = bobX;
            this._position[1] = bobY
        } else {
            const time = deltaTime * 5.0;
            vec3.lerp(this._position, this._position, this._restPosition, time);
        }
    }

    public async init(
        device: GPUDevice,
        pipeline: GPURenderPipeline
    ): Promise<void> {
        try {
            await this.loadAssets();
            if(!this.armModel.texture || !this.armModel.sampler) throw new Error('Tex or sampler not loaded');

            this.armUniformBuffer = device.createBuffer({
                size: 256,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
        
            this.armBindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.armUniformBuffer,
                            size: 256
                        }
                    }
                ]
            });
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async render(
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        passEncoder: GPURenderPassEncoder,
        camera: Camera,
        projectionMatrix: mat4
    ): Promise<void> {
        const viewMatrix = camera.getViewMatrixWithoutProjection();
        const cameraPosition = camera.playerController.getCameraPosition();
        const cameraForward = camera.playerController.getForward();
        const cameraRight = camera.playerController.getRight();
        const cameraUp = camera.playerController.getUp();
        const armMatrix = this.getModelMatrix(cameraPosition, cameraForward, cameraRight, cameraUp);

        const viewProjection = mat4.create();
        mat4.multiply(viewProjection, projectionMatrix, viewMatrix);

        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjection, armMatrix);

        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, armMatrix);

        const uniformData = new Float32Array(16 + 16 + 12 + 4);
        uniformData.set(mvp, 0);
        uniformData.set(armMatrix, 16);
        uniformData.set(normalMatrix, 32);
        uniformData.set([1.0, 1.0, 1.0], 44);
        device.queue.writeBuffer(this.armUniformBuffer, 0, uniformData);

        const armTextureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.armModel.sampler
                },
                {
                    binding: 1,
                    resource: this.armModel.texture.createView()
                }
            ]
        });

        //Lightning
            const ambientLightBuffer = this.lightningManager.getLightBuffer('ambient');
            if(!ambientLightBuffer) throw new Error('Ambient light err');
        
            const directionalLightBuffer = this.lightningManager.getLightBuffer('directional');
            if(!directionalLightBuffer) throw new Error('Directional light err');
                
            const lightningBindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(2),
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: ambientLightBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: directionalLightBuffer }
                    }
                ]
            });
        //
    
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, this.armBindGroup, [0]);
        passEncoder.setBindGroup(1, armTextureBindGroup);
        passEncoder.setBindGroup(2, lightningBindGroup);
        passEncoder.setVertexBuffer(0, this.armModel.vertex);
        passEncoder.setVertexBuffer(1, this.armModel.color);
        passEncoder.setIndexBuffer(this.armModel.index, 'uint16');
        passEncoder.drawIndexed(this.armModel.indexCount);
    }

    public update(
        deltaTime: number, 
        isMoving: boolean, 
        velocityMagnitude: number,
        isJumping: boolean,
        camera: Camera,
    ): void {
        const scaledDeltaTime = deltaTime * this.tick.getTimeScale();
        this._isMoving = isMoving;
        let targetPosition = vec3.clone(this._restPosition);

        //Rotation
            if(this._isMoving || isJumping) {
                this._targetRotationX = -20.0;
                targetPosition[0] += Math.sin(this._movementTimer * 0.5) * this._bobIntensity;
                targetPosition[1] += Math.sin(this._movementTimer) * this._bobIntensity;
            } else {
                this._targetRotationX = 0.0;
            }
        //
        
        this._currentRotationX += (this._targetRotationX - this._currentRotationX) * scaledDeltaTime * this._rotationSmoothFactor;
        this._movementTimer += deltaTime * this._bobSpeed;
        const moveTime = this._movementTimer * 2.0;
        
        this._targetSway = this._isMoving ? Math.sin(moveTime) * this._swayAmount : 0;
        this._currentSway += (this._targetSway - this._currentSway) * deltaTime * this._smoothFactor;
        this.updateBobPosition(deltaTime);
    }
}