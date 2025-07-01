export class ShaderLoader {
    device;
    constructor(device) {
        this.device = device;
    }
    async loader(url) {
        const res = await fetch(url);
        const code = await res.text();
        return this.device.createShaderModule({ code });
    }
}
