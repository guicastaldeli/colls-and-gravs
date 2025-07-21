export class ShadowPipelineManager {
    _shadowPipeline;
    shaderLoader;
    constructor(shaderLoader) {
        this.shaderLoader = shaderLoader;
    }
    async initShaders(device) {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl'),
                this.shaderLoader.loader('./lightning/shaders/shadow-frag.wgsl')
            ]);
            return {
                vertexShader,
                fragShader
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async init(device, bindGroupLayout) {
        try {
            const { vertexShader, fragShader } = await this.initShaders(device);
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            });
            this._shadowPipeline = device.createRenderPipeline({
                layout: pipelineLayout,
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [{
                            arrayStride: 3 * 4,
                            attributes: [{
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                }]
                        }]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                            format: navigator.gpu.getPreferredCanvasFormat()
                        }]
                },
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
        if (!this._shadowPipeline)
            throw new Error('Shadow pipeline err');
        return this._shadowPipeline;
    }
}
