import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class PointLight {
    _position;
    _color;
    _intensity;
    _range;
    _constant;
    _linear;
    _quadratic;
    //Shadows
    _shadowMap = null;
    _shadowMapView;
    _shadowSampler;
    _shadowMapSize = 1024;
    constructor(position = vec3.fromValues(0.0, 0.0, 0.0), color = vec3.fromValues(1.0, 1.0, 1.0), intensity = 1.0, range = 10.0) {
        this._position = position;
        this._color = color;
        this._intensity = intensity;
        this._range = range;
        this._constant = 1.0;
        this._linear = 0.01;
        this._quadratic = 0.01;
    }
    //Position
    set position(value) {
        this._position = value;
    }
    get position() {
        return this._position;
    }
    //Color
    set color(value) {
        this._color = value;
    }
    get color() {
        return this._color;
    }
    //Intensity
    set intensity(value) {
        this._intensity = value;
    }
    get intensity() {
        return this._intensity;
    }
    //Range
    set range(value) {
        this._range = value;
    }
    get range() {
        return this._range;
    }
    getBufferData() {
        const data = new Float32Array(14);
        data.set(this._position, 0);
        data[3] = 0.0;
        data.set(this._color, 4);
        data[7] = 0.0;
        data[8] = this._intensity;
        data[9] = this._range;
        data[10] = this._constant;
        data[11] = this._linear;
        data[12] = this._quadratic;
        data[13] = 0.0;
        return data;
    }
    //Shadow Functions
    initShadowResources(device) {
        if (this._shadowMap &&
            this._shadowMap.width === this._shadowMapSize &&
            this._shadowMap.height === this._shadowMapSize) {
            return;
        }
        if (this._shadowMap) {
            device.queue.onSubmittedWorkDone().then(() => {
                this._shadowMap?.destroy();
            });
        }
        this._shadowMap = device.createTexture({
            size: {
                width: this._shadowMapSize,
                height: this._shadowMapSize,
                depthOrArrayLayers: 6
            },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: 'depth32float',
            dimension: '2d'
        });
        this._shadowMapView = this._shadowMap.createView({
            dimension: 'cube'
        });
        this._shadowSampler = device.createSampler({
            compare: 'less',
            magFilter: 'linear',
            minFilter: 'linear'
        });
    }
    getFaceMatrices() {
        const matrices = [];
        const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 2, 1.0, 0.1, this._range);
        const directions = [
            [1, 0, 0], [-1, 0, 0],
            [0, 1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1]
        ];
        const ups = [
            [0, -1, 0], [0, -1, 0],
            [0, 0, 1], [0, 0, -1],
            [0, -1, 0], [0, -1, 0]
        ];
        for (let i = 0; i < 6; i++) {
            const viewMatrix = mat4.lookAt(mat4.create(), this._position, [
                this._position[0] + directions[i][0],
                this._position[1] + directions[i][1],
                this._position[2] + directions[i][2]
            ], ups[i]);
            const viewProjection = mat4.create();
            mat4.multiply(viewProjection, projectionMatrix, viewMatrix);
            matrices.push(viewProjection);
        }
        return matrices;
    }
    async renderPointLightShadowPass(device, light, renderBuffers, shadowPipeline, bindGroup, pointLightGroup) {
        if (!this._shadowMapView)
            return;
        const commandEncoder = device.createCommandEncoder();
        const faceMatrices = this.getFaceMatrices();
        for (let face = 0; face < 6; face++) {
            if (!this._shadowMap)
                throw new Error('err');
            const offset = 256 * face;
            const shadowPass = commandEncoder.beginRenderPass({
                colorAttachments: [],
                depthStencilAttachment: {
                    view: this._shadowMap.createView({
                        baseArrayLayer: face,
                        arrayLayerCount: 1,
                        dimension: '2d'
                    }),
                    depthClearValue: 1.0,
                    depthLoadOp: 'clear',
                    depthStoreOp: 'store'
                }
            });
            shadowPass.setPipeline(shadowPipeline);
            shadowPass.setBindGroup(0, bindGroup, [offset]);
            shadowPass.setBindGroup(1, pointLightGroup);
            for (const data of renderBuffers) {
                const mvp = mat4.create();
                mat4.multiply(mvp, faceMatrices[face], data.modelMatrix);
                shadowPass.setVertexBuffer(0, data.vertex);
                shadowPass.setIndexBuffer(data.index, 'uint16');
                shadowPass.drawIndexed(data.indexCount);
            }
            shadowPass.end();
        }
    }
    get shadowMapView() {
        return this._shadowMapView;
    }
    get shadowSampler() {
        return this._shadowSampler;
    }
}
