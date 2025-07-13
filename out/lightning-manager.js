import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class LightningManager {
    device;
    lights = new Map();
    lightBuffers = new Map();
    matrixBuffers = new Map();
    uniformBuffer = null;
    constructor(device) {
        this.device = device;
        this.initBuffer();
    }
    initBuffer() {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    addLight(id, type, light) {
        this.lights.set(id, { type, light });
        if (!this.lightBuffers.has(id)) {
            const bufferSize = {
                'ambient': 16,
                'directional': 32
            };
            this.lightBuffers.set(id, this.device.createBuffer({
                size: bufferSize[type],
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
            this.matrixBuffers.set(id, this.device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.updateLightBuffer(id);
    }
    getMatrixBuffer(id) {
        return this.lightBuffers.get(id) ?? null;
    }
    getLightBuffer(id) {
        return this.lightBuffers.get(id) ?? null;
    }
    getLight(id) {
        return this.lights.get(id)?.light || null;
    }
    updateLightBuffer(id) {
        const lightData = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);
        if (!lightData || !buffer)
            return;
        const { type, light } = lightData;
        let data = null;
        if (type === 'ambient') {
            const ambientLight = light;
            data = new Float32Array(4);
            data.set(ambientLight.getColorWithIntensity(), 0);
            data[3] = ambientLight.intensity;
            if (data)
                this.device.queue.writeBuffer(buffer, 0, data);
        }
        if (type === 'directional') {
            const directionalLight = light;
            const propBuffer = this.lightBuffers.get(id);
            const matrixBuffer = this.matrixBuffers.get(id);
            if (!propBuffer || !matrixBuffer)
                return;
            const direction = vec3.create();
            vec3.subtract(direction, directionalLight._target, directionalLight._position);
            vec3.normalize(direction, direction);
            const propData = new Float32Array(8);
            propData.set(direction, 0);
            propData.set(directionalLight._color, 3);
            propData[6] = directionalLight._intensity;
            propBuffer[7] = 0;
            this.device.queue.writeBuffer(propBuffer, 0, propData);
            const matrixData = new Float32Array(16);
            for (let i = 0; i < 16; i++)
                matrixData[i] = directionalLight.viewProjectionMatrix[i];
            if (data)
                this.device.queue.writeBuffer(matrixBuffer, 0, matrixData);
        }
    }
    updateAllLightBuffers() {
        this.lights.forEach((_, id) => this.updateLightBuffer(id));
    }
    //Ambient Light
    addAmbientLight(id, light) {
        this.addLight(id, 'ambient', light);
    }
    getAmbientLight(id) {
        const light = this.lights.get(id);
        return light?.type === 'ambient' ? light.light : null;
    }
    //
    //Directional Light
    addDirectionalLight(id, light) {
        if (this.lightBuffers.has(id) && this.matrixBuffers.has(id)) {
            this.addLight(id, 'directional', light);
        }
        else {
            this.lightBuffers.set(id, this.device.createBuffer({
                size: 32,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
            this.matrixBuffers.set(id, this.device.createBuffer({
                size: 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
            this.lights.set(id, { type: 'directional', light });
            this.updateLightBuffer(id);
        }
    }
    getDirectionalLight(id) {
        const light = this.lights.get(id);
        return light?.type === 'directional' ? light.light : null;
    }
}
