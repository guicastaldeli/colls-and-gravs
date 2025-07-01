export class ShaderLoader {
    private device: GPUDevice;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    public async loader(url: string): Promise<GPUShaderModule> {
        const res = await fetch(url);
        const code = await res.text();
        return this.device.createShaderModule({ code });
    }
}