import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class PointLight {
    _position;
    _color;
    _intensity;
    _range;
    _constant;
    _linear;
    _quadratic;
    constructor(position = vec3.fromValues(0.0, 0.0, 0.0), color = vec3.fromValues(1.0, 1.0, 1.0), intensity = 1.0, range = 10.0) {
        this._position = position;
        this._color = color;
        this._intensity = intensity;
        this._range = range;
        this._constant = 1.0;
        this._linear = 0.09;
        this._quadratic = 0.04;
        console.log("Light data size:", this.getBufferData().length * 4, "bytes");
        console.log("Light data:", this.getBufferData());
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
        const data = new Float32Array(12);
        data.set(this._position, 0);
        data[3] = 0.0;
        data.set(this._color, 4);
        data[7] = 0.0;
        data[8] = this._intensity;
        data[9] = this._range;
        data[10] = this._constant;
        data[11] = this._linear;
        data[12] = this._quadratic;
        return data;
    }
}
