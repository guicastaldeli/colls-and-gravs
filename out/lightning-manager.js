export class LightningManager {
    device;
    lights = new Map();
    lightBuffers = new Map();
    uniformBuffer = null;
    constructor(device) {
        this.device = device;
        this.initBaseBuffer();
    }
    initBaseBuffer() {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    getLightBuffer(id) {
        return this.lightBuffers.get(id) ?? null;
    }
    addLight(id, ambientLight) {
        this.lights.set(id, ambientLight);
        if (!this.lightBuffers.has(id)) {
            this.lightBuffers.set(id, this.device.createBuffer({
                size: 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
        this.updateLightBuffer(id);
    }
    getLight(id) {
        return this.lights.get(id) || null;
    }
    removeLight(id) {
        const buffer = this.lightBuffers.get(id);
        if (buffer)
            buffer.destroy();
        this.lights.delete(id);
        this.lightBuffers.delete(id);
    }
    cleanup() {
        this.lightBuffers.forEach(buffer => buffer.destroy());
        this.lights.clear();
        this.lightBuffers.clear();
        if (this.uniformBuffer)
            this.uniformBuffer.destroy();
    }
    updateLightBuffer(id) {
        const light = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);
        if (light && buffer) {
            const data = new Float32Array(4);
            data.set(light.getColorWithIntensity(), 0);
            data[3] = light.intensity;
            this.device.queue.writeBuffer(buffer, 0, data);
        }
    }
}
