import { mat4, vec3 } from "../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../shader-loader.js";

export class Stars {
    private device: GPUDevice;
    public pipeline!: GPURenderPipeline;
    private pipelineLayout!: GPUPipelineLayout;
    public vertexBuffer!: GPUBuffer;
    public uniformBuffers: GPUBuffer[] = [];
    public currentBufferIndex: number = 0;
    public bindGroups: GPUBindGroup[] = [];
    public colorBuffer!: GPUBuffer;
    public scaleBuffer!: GPUBuffer;
    public phaseBuffer!: GPUBuffer;
    public uvBuffer!: GPUBuffer;
    public numStars: number = 5000;
    private shaderLoader: ShaderLoader;

    public twinkleTime: number = 0.0;
    public rotationAngle: number = 0.0;
    public rotationSpeed: number = 0.0001;

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
                phase,
                uv
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
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.scaleBuffer, 0, scale);

            this.phaseBuffer = this.device.createBuffer({
                size: phase.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.phaseBuffer, 0, phase);
            
            this.uvBuffer = this.device.createBuffer({
                size: uv.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.uvBuffer, 0, uv);
    
            this.createUniformBuffers();

            this.pipelineLayout = this.device.createPipelineLayout({
                bindGroupLayouts: [
                    this.device.createBindGroupLayout({
                        entries: [{
                            binding: 0,
                            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                            buffer: { type: 'uniform' }
                        }]
                    })
                ]
            });

            this.pipeline = this.device.createRenderPipeline({
                layout: this.pipelineLayout,
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
                        },
                        {
                            arrayStride: 2 * 4,
                            attributes: [{
                                shaderLocation: 4,
                                offset: 0,
                                format: 'float32x2'
                            }]
                        }
                    ]
                },
                fragment: {
                    module: fragShader,
                    entryPoint: 'main',
                    targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat(),
                        blend: {
                            color: {
                                srcFactor: 'src-alpha',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            },
                            alpha: {
                                srcFactor: 'one',
                                dstFactor: 'one-minus-src-alpha',
                                operation: 'add'
                            }
                        },
                        writeMask: GPUColorWrite.ALL
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less-equal',
                    format: 'depth24plus'
                }
            });

            this.bindGroups = this.uniformBuffers.map(buffer => {
                return this.device.createBindGroup({
                    layout: this.pipeline.getBindGroupLayout(0),
                    entries: [{
                        binding: 0,
                        resource: { buffer }
                    }]
                })
            });
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private createUniformBuffers(): void {
        for(let i = 0; i < 2; i++) {
            this.uniformBuffers.push(this.device.createBuffer({
                size: 80 + 64,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
    }

    private setStars(count: number) {
        const verticesPerStar = 6;
        const pos = new Float32Array(count * 3);
        const color = new Float32Array(count * 3);
        const scale = new Float32Array(count);
        const phase = new Float32Array(count);
        const uv = new Float32Array(count * 2);

        for(let i = 0; i < count; i++) {
            const radius = 20;
            const t = Math.random() * Math.PI * 2;
            const p = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(p) * Math.cos(t) * 8;
            const y = radius * Math.sin(p) * Math.sin(t) * 10;
            const z = radius * Math.cos(p) * 10;

            const starScale = 0.1 + Math.random() * 0.4;
            const starPhase = Math.random() * Math.PI * 2;
            let starColor = Math.random() * 0.7 ?
            [1.0, 1.0, 1.0] :
            [0.3, 0.3, 0.3];

            const baseIndex = i * verticesPerStar;
            
            for(let v = 0; v < verticesPerStar; v++) {
                const vertexIndex = i * verticesPerStar + v;

                pos[vertexIndex * 3] = x;
                pos[vertexIndex * 3 + 1] = y;
                pos[vertexIndex * 3 + 2] = z;

                color[vertexIndex * 3] = starColor[0];
                color[vertexIndex * 3 + 1] = starColor[1];
                color[vertexIndex * 3 + 2] = starColor[2];

                scale[vertexIndex] = starScale;
                phase[vertexIndex] = starPhase;
            }

            uv[(baseIndex + 0) * 2] = 0.0; uv[(baseIndex + 0) * 2 + 1] = 0.0;
            uv[(baseIndex + 1) * 2] = 1.0; uv[(baseIndex + 1) * 2 + 1] = 0.0;
            uv[(baseIndex + 2) * 2] = 0.0; uv[(baseIndex + 2) * 2 + 1] = 1.0;
            
            uv[(baseIndex + 3) * 2] = 1.0; uv[(baseIndex + 3) * 2 + 1] = 0.0;
            uv[(baseIndex + 4) * 2] = 1.0; uv[(baseIndex + 4) * 2 + 1] = 1.0;
            uv[(baseIndex + 5) * 2] = 0.0; uv[(baseIndex + 5) * 2 + 1] = 1.0;
        }

        return {
            pos,
            color,
            scale,
            phase,
            uv
        }
    }

    public update(deltaTime: number): void {
        this.twinkleTime += deltaTime * 0.1;
    }
}