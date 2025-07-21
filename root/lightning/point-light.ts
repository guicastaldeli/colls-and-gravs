import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class PointLight {
    private _position: vec3;
    private _color: vec3;
    private _intensity: number;
    private _range: number;
    private _constant: number;
    private _linear: number;
    private _quadratic: number;

    //Shadows
    private _shadowMap: GPUTexture | null = null;
    private _shadowMapView!: GPUTextureView;
    private _shadowSampler!: GPUSampler;
    private _shadowMapSize: number = 1024;
    
    constructor(
        position: vec3 = vec3.fromValues(0.0, 0.0, 0.0),
        color: vec3 = vec3.fromValues(1.0, 1.0, 1.0),
        intensity: number = 1.0,
        range: number = 10.0
    ) {
        this._position = position;
        this._color = color;
        this._intensity = intensity;
        this._range = range;
        this._constant = 1.0;
        this._linear = 0.01;
        this._quadratic = 0.01;
    }

    //Position
    set position(value: vec3) {
        this._position = value;
    }

    get position(): vec3 {
        return this._position;
    }

    //Color
    set color(value: vec3) {
        this._color = value;
    }

    get color(): vec3 {
        return this._color;
    }

    //Intensity
    set intensity(value: number) {
        this._intensity = value;
    }

    get intensity(): number {
        return this._intensity
    }

    //Range
    set range(value: number) {
        this._range = value;
    }

    get range(): number {
        return this._range;
    }

    public getBufferData(): Float32Array {
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
    public initShadowResources(device: GPUDevice): void {
        if(this._shadowMap) this._shadowMap.destroy();

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

    public getFaceMatrices(): mat4[] {
        const matrices: mat4[] = [];
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

        for(let i = 0; i < 6; i++) {
            const viewMatrix = mat4.lookAt(mat4.create(),
                this._position,
                [
                    this._position[0] + directions[i][0],
                    this._position[1] + directions[i][1],
                    this._position[2] + directions[i][2]
                ],
                ups[i]
            );

            const viewProjection = mat4.create();
            mat4.multiply(viewProjection, projectionMatrix, viewMatrix);
            matrices.push(viewProjection);
        }

        return matrices;
    }

    public async renderPointLightShadowPass(
        device: GPUDevice,
        light: PointLight,
        renderBuffers: any[],
        shadowPipeline: GPURenderPipeline
    ): Promise<void> {
        if(!this._shadowMapView) return;

        const commandEncoder = device.createCommandEncoder();
        const faceMatrices = this.getFaceMatrices();

        for(let face = 0; face < 6; face++) {
            if(!this._shadowMap) throw new Error('err');

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

            for(const data of renderBuffers) {
                const mvp = mat4.create();
                mat4.multiply(mvp, faceMatrices[face], data.modelMatrix);
                shadowPass.setVertexBuffer(0, data.vertex);
                shadowPass.setIndexBuffer(data.index, 'uint16');
                shadowPass.drawIndexed(data.indexCount);
            }

            shadowPass.end();
        }

        device.queue.submit([commandEncoder.finish()]);
    }

    get shadowMapView(): GPUTextureView {
        return this._shadowMapView;
    }

    get shadowSampler(): GPUSampler {
        return this._shadowSampler;
    }
}