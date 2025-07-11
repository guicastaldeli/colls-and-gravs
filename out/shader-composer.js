export class ShaderComposer {
    device;
    constructor(device) {
        this.device = device;
    }
    async combineShader(mainCode, ...includes) {
        let combinedCode = '';
        for (const include of includes)
            combinedCode += include + '\n\n';
        combinedCode += mainCode;
        return combinedCode;
    }
    createShaderModule(code) {
        return this.device.createShaderModule({ code });
    }
}
