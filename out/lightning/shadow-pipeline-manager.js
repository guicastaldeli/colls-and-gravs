export class ShadowPipelineManager {
    _shadowPipeline;
    async initShaders(device) {
        try {
            const shaderCode = await fetch('./lightning/shaders/shadow.wgsl').then(res => res.text());
            const shaderModule = device.createShaderModule({ code: shaderCode });
            return shaderModule;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async init(device, pipelineLayout) {
        try {
            const module = await this.initShaders(device);
            this._shadowPipeline = device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module,
                    buffers: [{
                            arrayStride: 3 * 4,
                            attributes: [{
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                }]
                        }]
                },
                fragment: undefined,
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth32float'
                }
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    get shadowPipeline() {
        if (!this.shadowPipeline)
            throw new Error('Shadow pipeline err');
        return this._shadowPipeline;
    }
}
