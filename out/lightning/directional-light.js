import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class DirectionalLight {
    device;
    buffer;
    _direction;
    _color;
    _intensity;
    constructor(device, direction = [1, 1, 1], color = [1, 1, 1], intensity = 0.5) {
        this.device = device;
        this.buffer = device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        this._direction = direction;
        this._color = color;
        this._intensity = intensity;
    }
    updateBuffer() {
        const data = new Float32Array(0);
        data.set(this._direction, 0);
        data.set(this._color, 3);
        data[6] = this._intensity;
        this.device.queue.writeBuffer(this.buffer, 0, data);
    }
    getBuffer() {
        return this.buffer;
    }
    setDirection(direction) {
        vec3.normalize(this._direction, direction);
    }
}
