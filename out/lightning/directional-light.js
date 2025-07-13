import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class DirectionalLight {
    device;
    buffer;
    lightningManager;
    _position;
    _target;
    _color;
    _intensity;
    _near;
    _far;
    _width;
    _height;
    viewMatrix;
    projectionMatrix;
    viewProjectionMatrix;
    constructor(device, lightningManager, options = {}) {
        this.device = device;
        this.lightningManager = lightningManager;
        this._position = options.position || [0.0, 10.0, 0.0];
        this._target = options.target || [0.0, 0.0, 0.0];
        this._color = options.color || [1.0, 1.0, 1.0];
        this._intensity = options.intensity || 1.0;
        this._width = options.width || 20.0;
        this._height = options.height || 20.0;
        this._near = options.near || 0.1;
        this._far = options.far || 100.0;
        this.viewMatrix = mat4.create();
        this.projectionMatrix = mat4.create();
        this.viewProjectionMatrix = mat4.create();
        this.buffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.update();
    }
    setPosition(position) {
        vec3.copy(this._position, position);
        this.update();
    }
    setTarget(target) {
        vec3.copy(this._target, target);
        this.update();
    }
    setSize(w, h) {
        this._width = w;
        this._height = h;
        this.update();
    }
    getBuffer() {
        return this.buffer;
    }
    getViewProjectionMatrix() {
        return this.viewProjectionMatrix();
    }
    updateMatrix() {
        mat4.lookAt(this.viewMatrix, this._position, this._target, [0.0, 1.0, 0.0]);
        const halfWidth = this._width / 2;
        const halfHeight = this._height / 2;
        mat4.ortho(this.projectionMatrix, -halfWidth, halfWidth, -halfHeight, halfHeight, this._near, this._far);
    }
    updateBuffer() {
        //Prop Data
        const propBuffer = this.lightningManager.getLightBuffer('directional');
        if (!propBuffer)
            throw new Error('Directional Light buffer not found');
        const data = new Float32Array(8);
        const direction = vec3.create();
        vec3.subtract(direction, this._target, this._position);
        vec3.normalize(direction, direction);
        data.set(direction, 0);
        data.set(this._color, 3);
        data[6] = this._intensity;
        data[7] = 0;
        this.device.queue.writeBuffer(propBuffer, 0, data);
        //Matrix Data
        const matrixBuffer = this.lightningManager?.matrixBuffers.get('directional');
        if (!matrixBuffer)
            throw new Error('Directional light matrix not found');
        const matrixData = new Float32Array(16);
        for (let i = 0; i < 16; i++)
            matrixData[i] = this.viewProjectionMatrix[i];
        this.device.queue.writeBuffer(matrixBuffer, 0, matrixData);
    }
    update() {
        this.updateMatrix();
        this.updateBuffer();
    }
}
