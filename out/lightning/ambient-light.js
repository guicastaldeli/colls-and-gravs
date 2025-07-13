import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class AmbientLight {
    _color;
    _intensity;
    constructor(color = [1.0, 1.0, 1.0], intensity = 0.5) {
        this._color = vec3.clone(color);
        this._intensity = intensity;
    }
    get color() {
        return this._color;
    }
    set color(value) {
        this._color = vec3.clone(value);
    }
    get intensity() {
        return this._intensity;
    }
    set intensity(value) {
        this._intensity = value;
    }
    getColorWithIntensity() {
        return vec3.scale(vec3.create(), this._color, this._intensity);
    }
}
