import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class AmbientLight {
    private _color: vec3 = [1, 1, 1];
    private _intensity: number = 0.2;

    constructor(
        color: vec3 = [1, 1, 1],
        intensity: number = 0.2
    ) {
        this._color = vec3.clone(color);
        this.intensity = intensity;
    }

    get color(): vec3 {
        return this._color;
    }

    set color(value: vec3) {
        this._color = vec3.clone(value);
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(value: number) {
        this._intensity = value;
    }

    public getColorWithIntensity(): vec3 {
        return vec3.scale(vec3.create(), this._color, this._intensity);
    }
}