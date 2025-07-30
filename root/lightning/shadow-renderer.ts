import { vec3, mat4 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";
import { getBindGroups } from "../render.js";
import { PointLight } from "./point-light.js";

export class ShadowRenderer {
    private device: GPUDevice;
    private shaderLoader: ShaderLoader;
    private pipeline: GPURenderPipeline | null = null;

    constructor(device: GPUDevice, shaderLoader: ShaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
        this.initPipeline();
    }

    public async initPipeline(): Promise<void> {
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
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public async renderShadowPass(
        passEncoder: GPURenderPassEncoder,
        pointLight: PointLight, 
        renderBuffers: any[]
    ): Promise<void> {
        if(!this.pipeline) throw new Error('pipeline err');
        if(!pointLight.shadowMap || !pointLight.shadowSampler) return;

        passEncoder.setPipeline(this.pipeline);
        for(const data of renderBuffers) {
            passEncoder.setVertexBuffer(0, data.vertex);
            passEncoder.setIndexBuffer(data.index, 'uint16');
            passEncoder.drawIndexed(data.indexCount);
        }
    }

    private async loadShaders(): Promise<GPUShaderModule> {
        try {
            const vertexShader = this.shaderLoader.loader('./lightning/shaders/shadow-vertex.wgsl');
            return vertexShader;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }
}