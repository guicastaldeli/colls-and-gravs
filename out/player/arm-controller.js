import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class ArmController {
    tick;
    _position = vec3.create();
    _restPosition = vec3.create();
    //Buffers
    armBindGroup;
    armUniformBuffer;
    //Movement
    _isMoving = true;
    _movementTimer = 0.0;
    _bobIntensity = 0.3;
    _bobSpeed = 40.0;
    _swayAmount = 5.0;
    _currentSway = 0.0;
    _targetSway = 0.0;
    _smoothFactor = 8.0;
    //Size
    size = {
        w: 0.5,
        h: 0.6,
        d: 0.7
    };
    //Pos
    pos = {
        x: 0.25,
        y: -0.5,
        z: 0.5
    };
    //Model
    loader;
    armModel;
    constructor(tick, loader) {
        this.tick = tick;
        this.loader = loader;
        this.setRestPosition(this.pos.x, this.pos.y, this.pos.z);
    }
    async loadAssets() {
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
        const modelMatrix = mat4.create();
        const baseOffset = vec3.create();
        vec3.scaleAndAdd(baseOffset, baseOffset, cameraForward, this.pos.z);
        const rightOffset = vec3.create();
        vec3.scale(rightOffset, cameraRight, this.pos.x);
        const upOffset = vec3.create();
        vec3.scale(upOffset, cameraUp, this.pos.y);
        const finalPosition = vec3.create();
        vec3.add(finalPosition, cameraPosition, baseOffset);
        vec3.add(finalPosition, finalPosition, rightOffset);
        vec3.add(finalPosition, finalPosition, upOffset);
        mat4.translate(modelMatrix, modelMatrix, finalPosition);
        const rotationMatrix = mat4.create();
        const cameraMatrix = mat4.create();
        mat4.set(cameraMatrix, cameraRight[0], cameraRight[1], cameraRight[2], 0, cameraUp[0], cameraUp[1], cameraUp[2], 0, -cameraForward[0], -cameraForward[1], -cameraForward[2], 0, 0, 0, 0, 1);
        const baseRotation = mat4.create();
        mat4.rotateX(baseRotation, baseRotation, 100 * Math.PI / 180);
        mat4.rotateY(baseRotation, baseRotation, 180 * Math.PI / 180);
        mat4.rotateZ(baseRotation, baseRotation, 1.5);
        mat4.multiply(rotationMatrix, cameraMatrix, baseRotation);
        mat4.multiply(modelMatrix, modelMatrix, rotationMatrix);
        mat4.scale(modelMatrix, modelMatrix, [
            this.size.w,
            this.size.h,
            this.size.d
        ]);
        return modelMatrix;
    }
    updateBobPosition(deltaTime) {
        if (this._isMoving) {
            const bobX = Math.sin(this._movementTimer) * this._bobIntensity * 0.3;
            const bobY = Math.abs(Math.sin(this._movementTimer)) * this._bobIntensity;
            this._position[0] = this._restPosition[0] + bobX;
            this._position[1] = this._restPosition[1] + bobY;
            this._position[2] = this._restPosition[2];
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
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            });
            const armBindGroupLayout = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.VERTEX,
                        buffer: { type: 'uniform' }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 2,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    }
                ]
            });
            this.armBindGroup = device.createBindGroup({
                layout: armBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: this.armUniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: this.armModel.sampler
                    },
                    {
                        binding: 2,
                        resource: this.armModel.texture.createView()
                    },
                ]
            });
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async render(device, pipeline, passEncoder, camera, projectionMatrix) {
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
        device.queue.writeBuffer(this.armUniformBuffer, 0, mvp);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(2, this.armBindGroup);
        passEncoder.setVertexBuffer(0, this.armModel.vertex);
        passEncoder.setVertexBuffer(1, this.armModel.color);
        passEncoder.setIndexBuffer(this.armModel.index, 'uint16');
        passEncoder.drawIndexed(this.armModel.indexCount);
    }
    update(deltaTime, isMoving) {
        const timeSpeed = deltaTime * this._bobSpeed;
        this._isMoving = isMoving;
        if (this._isMoving)
            this._movementTimer += timeSpeed;
        const moveTime = this._movementTimer * 2.0;
        this._targetSway = this._isMoving ?
            Math.sin(moveTime) * this._swayAmount : 0;
        this._currentSway += (this._targetSway - this._currentSway) * deltaTime * this._smoothFactor;
        this.updateBobPosition(deltaTime);
    }
}
