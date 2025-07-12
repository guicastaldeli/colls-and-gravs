import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class DirectionalLight {
    device;
    buffer;
    _direction;
    _color;
    _intensity;
    constructor(device, direction = [0, -1, 0], color = [1, 1, 1], intensity = 1.0) {
        this.device = device;
        this.buffer = device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: false
        });
        this._direction = direction;
        vec3.normalize(this._direction, direction);
        this._color = color;
        this._intensity = intensity;
        this.updateBuffer();
    }
    updateBuffer() {
        const data = new Float32Array(8);
        data.set(this._direction, 0);
        data.set(this._color, 3);
        data[6] = this._intensity;
        this.device.queue.writeBuffer(this.buffer, 0, data);
    }
    getBuffer() {
        return this.buffer;
    }
    getColor(color) {
        this._color = vec3.clone(color);
        this.updateBuffer();
    }
    setIntensity(intensity) {
        this._intensity = intensity;
        this.updateBuffer();
    }
    setDirection(direction) {
        this._direction = vec3.clone(direction);
        vec3.normalize(this._direction, this._direction);
        this.updateBuffer();
    }
}
