export class ShaderComposer {
    private device: GPUDevice;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    public async combineShader(
        mainCode: string,
        ...includes: string[]
    ): Promise<string> {
        let combinedCode = '';
        for(const include of includes) combinedCode += include + '\n\n';
        combinedCode += mainCode;
        return combinedCode;
    }

    public createShaderModule(code: string): GPUShaderModule {
        return this.device.createShaderModule({ code });
    }
}