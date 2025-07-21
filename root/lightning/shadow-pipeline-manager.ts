export class ShadowPipelineManager {
    private _shadowPipeline!: GPURenderPipeline;

    private async initShaders(device: GPUDevice): Promise<GPUShaderModule> {
        try {
            const shaderCode = await fetch('./lightning/shaders/shadows.wgsl').then(res => res.text());
            const shaderModule = device.createShaderModule({ code: shaderCode });
            return shaderModule;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async init(device: GPUDevice, bindGroupLayout: GPUBindGroupLayout): Promise<void> {
        try {
            const module = await this.initShaders(device);
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            });

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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    get shadowPipeline(): GPURenderPipeline {
        if(!this._shadowPipeline) throw new Error('Shadow pipeline err');
        return this._shadowPipeline;
    }
}