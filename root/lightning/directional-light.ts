import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class DirectionalLight {
    private device: GPUDevice;
    private buffer: GPUBuffer;

    public _direction: vec3;
    public _color: vec3;
    public _intensity: number;

    constructor(
        device: GPUDevice,
        direction: vec3,
        color: vec3,
        intensity: number
    ) {
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

    public updateBuffer() {
        const data = new Float32Array(0);
        data.set(this._direction, 0);
        data.set(this._color, 3);
        data[6] = this._intensity;
        this.device.queue.writeBuffer(this.buffer, 0, data);
    }

    public getBuffer(): GPUBuffer {
        return this.buffer;
    }

    public setDirection(direction: vec3) {
        vec3.normalize(this._direction, direction);
    }
}