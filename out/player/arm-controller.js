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
        w: 1.5,
        h: 1.5,
        d: 1.5
    };
    //Pos
    pos = {
        x: 0,
        y: 0.5,
        z: 5.0
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
    getModelMatrix() {
        const modelMatrix = mat4.create();
        mat4.identity(modelMatrix);
        mat4.translate(modelMatrix, modelMatrix, [
            this._position[0],
            this._position[1],
            this._position[2]
        ]);
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
        const armMatrix = this.getModelMatrix();
        const viewProjection = mat4.create();
        mat4.multiply(viewProjection, projectionMatrix, viewMatrix);
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjection, armMatrix);
        device.queue.writeBuffer(this.armUniformBuffer, 0, mvp);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, this.armBindGroup, [0]);
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
