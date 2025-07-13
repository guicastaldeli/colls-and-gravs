import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class DirectionalLight {
    private _color: vec3;
    private _direction: vec3;
    private _intensity: number;

    constructor(
        color: vec3,
        direction: vec3,
        intensity: number = 1.0
    ) {
        this._color = vec3.clone(color);
        this._direction = vec3.normalize(vec3.create(), direction);
        this._intensity = intensity;
    }

    //Direction
    set direction(value: vec3) {
        this._direction = vec3.clone(value);
    }

    get direction(): vec3 {
        return this._direction;
    }

    //Color
    set color(value: vec3) {
        this._color = vec3.clone(value);
    } 

    get color(): vec3 {
        return this._color
    }

    //Intensity
    set intensity(value: number) {
        this._intensity = value;
    }

    get intensity(): number {
        return this._intensity;
    }

    public getColorWithIntensity(): Float32Array {
        const result = vec3.create();
        vec3.scale(result, this._color, this._intensity);
        return new Float32Array(result);
    }

    public getDirectionArray(): Float32Array {
        return new Float32Array(this._direction);
    }

    public getShaderData(): Float32Array {
        const data = new Float32Array(8);
        data.set(this.getColorWithIntensity(), 0);
        data[3] = this._intensity;
        data.set(this.getDirectionArray(), 4);
        data[7] = 0.0;
        return data;
    }
}