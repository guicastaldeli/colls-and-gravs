import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
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
    //Shadows
    async initShadowMap(device) {
        this._shadowMap = device.createTexture({
            size: [this._shadowMapSize, this._shadowMapSize, 6],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            dimension: '2d'
        });
    }
    get shadowMap() {
        return this._shadowMap;
    }
    get shadowMapSize() {
        return this._shadowMapSize;
    }
}
