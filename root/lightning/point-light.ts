import { device } from "../init.js";
import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { LightningManager } from "../lightning-manager.js";
import { getBindGroups } from "../render.js";

export class PointLight {
    private _position: vec3;
    private _color: vec3;
    private _intensity: number;
    private _range: number;
    private _constant: number;
    private _linear: number;
    private _quadratic: number;

    //Shadows
    public _shadowMap: GPUTexture | null = null;
    private _shadowMapView!: GPUTextureView;
    public _shadowSampler!: GPUSampler;
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
        this.initShadowMap(device);
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
    
    private initShadowMap(device: GPUDevice): void {
        this._shadowMap = device.createTexture({
            size: [this._shadowMapSize, this._shadowMapSize, 6],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
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

    get shadowMap(): GPUTextureView | null {
        return this._shadowMapView;
    }

    get shadowSampler(): GPUSampler | null {
        return this._shadowSampler;
    }
}