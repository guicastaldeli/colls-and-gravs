import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";

export class DirectionalLight {
    private device: GPUDevice;
    private buffer: GPUBuffer;

    public _direction: vec3;
    public _color: vec3;
    public _intensity: number;

    constructor(
        device: GPUDevice,
        direction: vec3 = [0, -1, 0],
        color: vec3 = [1, 1, 1],
        intensity: number = 1.0
    ) {
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

    public updateBuffer() {
        const data = new Float32Array(8);
        data.set(this._direction, 0);
        data.set(this._color, 3);
        data[6] = this._intensity;
        this.device.queue.writeBuffer(this.buffer, 0, data);
    }

    public getBuffer(): GPUBuffer {
        return this.buffer;
    }

    public getColor(color: vec3): void {
        this._color = vec3.clone(color);
        this.updateBuffer();
    }

    public setIntensity(intensity: vec3): void {
        this._intensity = intensity;
        this.updateBuffer();
    }

    public setDirection(direction: vec3) {
        this._direction = vec3.clone(direction);
        vec3.normalize(this._direction, this._direction);
        this.updateBuffer();
    }
}