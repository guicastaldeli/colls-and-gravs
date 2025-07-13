export class LightningManager {
    device;
    lights = new Map();
    lightBuffers = new Map();
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
            };
            this.lightBuffers.set(id, this.device.createBuffer({
                size: bufferSize[type],
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.updateLightBuffer(id);
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
        }
        if (data)
            this.device.queue.writeBuffer(buffer, 0, data);
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
        this.addLight(id, 'directional', light);
    }
    getDirectionalLight(id) {
    }
}
