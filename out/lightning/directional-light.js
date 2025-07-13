import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class DirectionalLight {
    _color;
    _direction;
    _intensity;
    constructor(color, direction, intensity = 1.0) {
        this._color = vec3.clone(color);
        this._direction = vec3.normalize(vec3.create(), direction);
        this._intensity = intensity;
    }
    //Direction
    set direction(value) {
        this._direction = vec3.clone(value);
    }
    get direction() {
        return this._direction;
    }
    //Color
    set color(value) {
        this._color = vec3.clone(value);
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
    getColorWithIntensity() {
        const result = vec3.create();
        vec3.scale(result, this._color, this._intensity);
        return new Float32Array(result);
    }
    getDirectionArray() {
        return new Float32Array(this._direction);
    }
    getShaderData() {
        const data = new Float32Array(8);
        data.set(this.getColorWithIntensity(), 0);
        data[3] = this._intensity;
        data.set(this.getDirectionArray(), 4);
        data[7] = 0.0;
        return data;
    }
}
