import { AmbientLight } from "./lightning/ambient-light.js";

export class LightningManager {
    private device: GPUDevice;

    private lights: Map<string, AmbientLight> = new Map();
    private lightBuffers: Map<string, GPUBuffer> = new Map();
    private uniformBuffer: GPUBuffer | null = null;

    constructor(device: GPUDevice) {
        this.device = device;
        this.initBaseBuffer();
    }

    private initBaseBuffer(): void {
        this.uniformBuffer = this.device.createBuffer({
            size: 256,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    public getLightBuffer(id: string): GPUBuffer | null {
        return this.lightBuffers.get(id) ?? null;
    }

    public addLight(
        id: string,
        ambientLight: AmbientLight
    ): void {
        this.lights.set(id, ambientLight);

        if(!this.lightBuffers.has(id)) {
            this.lightBuffers.set(
                id,
                this.device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                })
            );
        }

        this.updateLightBuffer(id);
    }

    public getLight(id: string): AmbientLight | null {
        return this.lights.get(id) || null;
    }

    public removeLight(id: string): void {
        const buffer = this.lightBuffers.get(id);
        if(buffer) buffer.destroy();
        this.lights.delete(id);
        this.lightBuffers.delete(id);
    }

    public cleanup(): void {
        this.lightBuffers.forEach(buffer => buffer.destroy());
        this.lights.clear();
        this.lightBuffers.clear();
        if(this.uniformBuffer) this.uniformBuffer.destroy();
    }

    public updateLightBuffer(id: string): void {
        const light = this.lights.get(id);
        const buffer = this.lightBuffers.get(id);

        if(light && buffer) {
            const data = new Float32Array(4);
            data.set(light.getColorWithIntensity(), 0);
            data[3] = light.intensity;
            this.device.queue.writeBuffer(buffer, 0, data); 
        }
    }
}