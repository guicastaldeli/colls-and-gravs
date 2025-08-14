import { mat3, mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class ArmController {
    tick;
    lightningManager;
    _position = vec3.create();
    _restPosition = vec3.create();
    //Buffers
    armBindGroup;
    armUniformBuffer;
    //Movement
    _isMoving = true;
    _movementTimer = 0.0;
    _bobIntensity = 10.0;
    _bobSpeed = 50.0;
    _swayAmount = 15.0;
    _currentSway = 0.0;
    _targetSway = 0.0;
    _smoothFactor = 20.0;
    //Rotation
    _currentRotationX = 0.0;
    _targetRotationX = 0.0;
    _rotationSmoothFactor = 3.0;
    //Delay
    _delayedForward = vec3.create();
    _delayedRight = vec3.create();
    _delayedUp = vec3.create();
    _delayFactor = 0.1;
    //Weapon
    currentWeapon = null;
    //Size
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    //Pos
    pos = {
        x: 0.5,
        y: -0.9,
        z: 0.5
    };
    //Model
    loader;
    armModel;
    currentModel;
    //
    constructor(tick, loader, lightningManager) {
        this.tick = tick;
        this.loader = loader;
        this.lightningManager = lightningManager;
        this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
    }
    async setWeapon(weapon) {
        this.currentWeapon = weapon;
        if (weapon) {
            const buffers = await weapon.getBuffers();
            if (buffers) {
                const fBuffers = Array.isArray(buffers) ? buffers[0] : buffers;
                if (!fBuffers) {
                    this.currentModel = this.armModel;
                    this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
                    return;
                }
                this.currentModel = {
                    vertex: fBuffers.vertex,
                    color: fBuffers.color,
                    index: fBuffers.index,
                    indexCount: fBuffers.indexCount,
                    texture: fBuffers.texture,
                    sampler: fBuffers.sampler
                };
                this.setRestPosition(weapon.getWeaponPos()[0], weapon.getWeaponPos()[1], weapon.getWeaponPos()[2]);
            }
            else {
                this.currentModel = this.armModel;
                this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
            }
        }
        else {
            this.currentModel = this.armModel;
            this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
        }
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./.assets/player/arm.obj'),
                this.loader.textureLoader('./.assets/player/arm.png')
            ]);
            this.armModel = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                texture: tex,
                sampler: this.loader.createSampler()
            };
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    setRestPosition(x, y, z) {
        vec3.set(this._restPosition, x, y, z);
        vec3.copy(this._position, this._restPosition);
    }
    getModelMatrix(cameraPosition, cameraForward, cameraRight, cameraUp) {
        vec3.lerp(this._delayedForward, this._delayedForward, cameraForward, this._delayFactor);
        vec3.lerp(this._delayedRight, this._delayedRight, cameraRight, this._delayFactor);
        vec3.lerp(this._delayedUp, this._delayedUp, cameraUp, this._delayFactor);
        const modelMatrix = mat4.create();
        const weaponOffset = this.currentWeapon?.getWeaponPos() || this._restPosition;
        const baseOffset = vec3.create();
        vec3.scaleAndAdd(baseOffset, baseOffset, this._delayedForward, weaponOffset[2]);
        const rightOffset = vec3.create();
        vec3.scale(rightOffset, this._delayedRight, weaponOffset[0]);
        const upOffset = vec3.create();
        vec3.scale(upOffset, this._delayedUp, weaponOffset[1]);
        const finalPosition = vec3.create();
        vec3.add(finalPosition, cameraPosition, baseOffset);
        vec3.add(finalPosition, finalPosition, rightOffset);
        vec3.add(finalPosition, finalPosition, upOffset);
        mat4.translate(modelMatrix, modelMatrix, finalPosition);
        const cameraMatrix = mat4.create();
        mat4.set(cameraMatrix, cameraRight[0], cameraRight[1], cameraRight[2], 0, cameraUp[0], cameraUp[1], cameraUp[2], 0, -cameraForward[0], -cameraForward[1], -cameraForward[2], 0, 0, 0, 0, 1.0);
        const armRotation = mat4.create();
        mat4.rotateX(armRotation, armRotation, this._currentRotationX * Math.PI / 180);
        mat4.rotateY(armRotation, armRotation, 90 * -Math.PI / 180);
        const weaponRotationMatrix = mat4.create();
        const rotationAngle = this.currentWeapon?.getWeaponRotation() || 0;
        mat4.rotateX(weaponRotationMatrix, weaponRotationMatrix, rotationAngle);
        const combinedRotation = mat4.create();
        mat4.multiply(combinedRotation, cameraMatrix, weaponRotationMatrix);
        mat4.multiply(combinedRotation, combinedRotation, armRotation);
        mat4.multiply(modelMatrix, modelMatrix, combinedRotation);
        mat4.scale(modelMatrix, modelMatrix, [this.size.w, this.size.h, this.size.d]);
        return modelMatrix;
    }
    updateBobPosition(deltaTime) {
        if (this._isMoving) {
            this._movementTimer += deltaTime * this._bobSpeed;
            const bobX = Math.sin(this._movementTimer * 0.5) * this._bobIntensity;
            const bobY = Math.sin(this._movementTimer) * this._bobIntensity;
            this._position[0] = bobX;
            this._position[1] = bobY;
        }
        else {
            const time = deltaTime * 5.0;
            vec3.lerp(this._position, this._position, this._restPosition, time);
        }
    }
    async init(device, pipeline) {
        try {
            await this.loadAssets();
            if (!this.armModel.texture || !this.armModel.sampler)
                throw new Error('Tex or sampler not loaded');
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
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async render(device, pipeline, passEncoder, camera, projectionMatrix) {
        if (!this.currentModel)
            this.currentModel = this.armModel;
        const viewMatrix = camera.getViewMatrixWithoutProjection();
        const cameraPosition = camera.playerController.getCameraPosition();
        const cameraForward = camera.playerController.getForward();
        const cameraRight = camera.playerController.getRight();
        const cameraUp = camera.playerController.getUp();
        const modelMatrix = this.getModelMatrix(cameraPosition, cameraForward, cameraRight, cameraUp);
        const viewProjection = mat4.create();
        mat4.multiply(viewProjection, projectionMatrix, viewMatrix);
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjection, modelMatrix);
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, modelMatrix);
        const uniformData = new Float32Array(16 + 16 + 12 + 4);
        uniformData.set(mvp, 0);
        uniformData.set(modelMatrix, 16);
        uniformData.set(normalMatrix, 32);
        uniformData.set([0.0, 0.0, 0.0], 44);
        device.queue.writeBuffer(this.armUniformBuffer, 0, uniformData);
        const armTextureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: this.currentModel.sampler
                },
                {
                    binding: 1,
                    resource: this.currentModel.texture.createView()
                }
            ]
        });
        //Lightning
        const ambientLightBuffer = this.lightningManager.getLightBuffer('ambient');
        if (!ambientLightBuffer)
            throw new Error('Ambient light err');
        const directionalLightBuffer = this.lightningManager.getLightBuffer('directional');
        if (!directionalLightBuffer)
            throw new Error('Directional light err');
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
        passEncoder.setVertexBuffer(0, this.currentModel.vertex);
        passEncoder.setVertexBuffer(1, this.currentModel.color);
        passEncoder.setIndexBuffer(this.currentModel.index, 'uint16');
        passEncoder.drawIndexed(this.currentModel.indexCount);
    }
    update(deltaTime, isMoving, velocityMagnitude, isJumping, camera) {
        const scaledDeltaTime = deltaTime * this.tick.getTimeScale();
        this._isMoving = isMoving;
        let targetPosition = vec3.clone(this._restPosition);
        //Rotation
        if (this._isMoving || isJumping) {
            this._targetRotationX = -20.0;
            targetPosition[0] += Math.sin(this._movementTimer * 0.5) * this._bobIntensity;
            targetPosition[1] += Math.sin(this._movementTimer) * this._bobIntensity;
        }
        else {
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
