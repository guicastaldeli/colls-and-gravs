import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class PointLight {
    private _position: vec3;
    private _color: vec3;
    private _intensity: number;
    private _range: number;
    private _constant: number;
    private _linear: number;
    private _quadratic: number;
    
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
        this._linear = 0.09;
        this._quadratic = 0.04;

        console.log("Light data size:", this.getBufferData().length * 4, "bytes");
console.log("Light data:", this.getBufferData());
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