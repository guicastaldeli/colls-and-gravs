import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";

export class Stars {
    private device: GPUDevice;
    public pipeline!: GPURenderPipeline;
    public vertexBuffer!: GPUBuffer;
    public uniformBuffer!: GPUBuffer;
    public bindGroup!: GPUBindGroup;
    public colorBuffer!: GPUBuffer;
    public scaleBuffer!: GPUBuffer;
    public phaseBuffer!: GPUBuffer;
    public numStars: number = 300;
    private shaderLoader: ShaderLoader;

    constructor(device: GPUDevice, shaderLoader: ShaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
    }

    public async createStars(): Promise<void> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./skybox/shaders/stars/vertex.wgsl'),
                this.shaderLoader.loader('./skybox/shaders/stars/frag.wgsl')
            ]);

            const {
                pos,
                color,
                scale,
                phase
            } = this.setStars(this.numStars);

            this.vertexBuffer = this.device.createBuffer({
                size: pos.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.vertexBuffer, 0, pos);
    
            this.colorBuffer = this.device.createBuffer({
                size: color.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.colorBuffer, 0, color);

            this.scaleBuffer = this.device.createBuffer({
                size: scale.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.scaleBuffer, 0, scale);

            this.phaseBuffer = this.device.createBuffer({
                size: phase.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
    
            this.uniformBuffer = this.device.createBuffer({
                size: 16 * 4 + 4,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });

            this.pipeline = this.device.createRenderPipeline({
                layout: 'auto',
                vertex: {
                    module: vertexShader,
                    entryPoint: 'main',
                    buffers: [
                        {
                            arrayStride: 3 * 4,
                            attributes: [{
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }]
                        },
                        {
                            arrayStride: 3 * 4,
                            attributes: [{
                                shaderLocation: 1,
                                offset: 0,
                                format: 'float32x3'
                            }]
                        },
                        {
                            arrayStride: 4,
                            attributes: [{
                                shaderLocation: 2,
                                offset: 0,
                                format: 'float32'
                            }]
                        },
                        {
                            arrayStride: 4,
                            attributes: [{
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32'
                            }]
                        }
                    ]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
                },
                primitive: {
                    topology: 'point-list'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                }
            });

            this.bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }]
            });
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private setStars(count: number) {
        const pos = new Float32Array(count * 3);
        const color = new Float32Array(count * 3);
        const scale = new Float32Array(count);
        const phase = new Float32Array(count);

        for(let i = 0; i < count; i++) {
            const radius = 50;
            const t = Math.random() * Math.PI * 2;
            const p = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = radius * Math.sin(p) * Math.cos(t);
            pos[i * 3 + 1] = radius * Math.sin(p) * Math.sin(t);
            pos[i * 3 + 2] = radius * Math.cos(p);

            if(Math.random() > 0.2) {
                color[i * 3] = 1.0;
                color[i * 3 + 1] = 1.0;
                color[i * 3 + 2] = 1.0;
            } else {
                color[i * 3] = 1.0 + Math.random() * 0.3;
                color[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                color[i * 3 + 2] = 0.6 + Math.random() * 0.3
            }

            scale[i] = 0.1 + Math.random() * 4;
            phase[i] = Math.random() * Math.PI * 2;
        }

        return {
            pos,
            color,
            scale,
            phase
        }
    }
}