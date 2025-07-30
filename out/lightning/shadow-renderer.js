export class ShadowRenderer {
    device;
    shaderLoader;
    pipeline = null;
    constructor(device, shaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
        this.initPipeline();
    }
    async initPipeline() {
        try {
            const vertexShader = await this.loadShaders();
            this.pipeline = this.device.createRenderPipeline({
                layout: 'auto',
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [{
                            arrayStride: 8 * 4,
                            attributes: [{
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: 'float32x3'
                                }]
                        }]
                },
                fragment: {
                    module: this.device.createShaderModule({
                        code: `
                            @fragment
                            fn main() -> @location(0) vec4f {
                                return vec4f(0.0, 0.0, 0.0, 1.0);
                            }
                        `
                    }),
                    entryPoint: 'main',
                    targets: [{
                            format: 'bgra8unorm'
                        }]
                },
                depthStencil: {
                    format: 'depth24plus',
                    depthWriteEnabled: true,
                    depthCompare: 'less'
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none'
                }
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async renderShadowPass(passEncoder, pointLight, renderBuffers) {
        if (!this.pipeline)
            throw new Error('pipeline err');
        if (!pointLight.shadowMap || !pointLight.shadowSampler)
            return;
        passEncoder.setPipeline(this.pipeline);
        for (const data of renderBuffers) {
            passEncoder.setVertexBuffer(0, data.vertex);
            passEncoder.setIndexBuffer(data.index, 'uint16');
            passEncoder.drawIndexed(data.indexCount);
        }
    }
    async loadShaders() {
        try {
            const vertexShader = this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl');
            return vertexShader;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
