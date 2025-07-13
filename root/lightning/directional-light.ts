import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { LightningManager } from "../lightning-manager.js";

export class DirectionalLight {
    private device: GPUDevice;
    private buffer: GPUBuffer;
    private lightningManager: LightningManager;

    public _position: vec3;
    public _target: vec3;
    public _color: vec3;
    public _intensity: number;
    public _near: number;
    public _far: number;
    public _width: number;
    public _height: number;
    public viewMatrix: mat4;
    public projectionMatrix: mat4;
    public viewProjectionMatrix: mat4;

    constructor(
        device: GPUDevice,
        lightningManager: LightningManager,
        options: {
            position?: vec3,
            target?: vec3,
            color?: vec3,
            intensity?: number,
            width?: number
            height?: number,
            near?: number,
            far?: number,
        } = {}
    ) {
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

    public setPosition(position: vec3): void {
        vec3.copy(this._position, position);
        this.update();
    }

    public setTarget(target: vec3): void {
        vec3.copy(this._target, target);
        this.update();
    }

    public setSize(w: number, h: number): void {
        this._width = w;
        this._height = h;
        this.update();
    }

    public getBuffer(): GPUBuffer {
        return this.buffer;
    }

    public getViewProjectionMatrix(): mat4 {
        return this.viewProjectionMatrix();
    }

    public updateMatrix(): void {
        mat4.lookAt(this.viewMatrix, this._position, this._target, [0.0, 1.0, 0.0]);

        const halfWidth = this._width / 2;
        const halfHeight = this._height / 2;

        mat4.ortho(
            this.projectionMatrix,
            -halfWidth, halfWidth,
            -halfHeight, halfHeight,
            this._near, this._far
        );
    }

    public updateBuffer(): void {
        //Prop Data
        const propBuffer = this.lightningManager.getLightBuffer('directional');
        if(!propBuffer) throw new Error('Directional Light buffer not found');

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
        if(!matrixBuffer) throw new Error('Directional light matrix not found');
        
        const matrixData = new Float32Array(16);
        for(let i = 0; i < 16; i++) matrixData[i] = this.viewProjectionMatrix[i];
        this.device.queue.writeBuffer(matrixBuffer, 0, matrixData);
    }

    public update(): void {
        this.updateMatrix();
        this.updateBuffer();
    }
}