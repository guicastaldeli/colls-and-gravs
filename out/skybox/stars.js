export class Stars {
    device;
    pipeline;
    vertexBuffer;
    uniformBuffers = [];
    currentBufferIndex = 0;
    bindGroup;
    colorBuffer;
    scaleBuffer;
    phaseBuffer;
    uvBuffer;
    numStars = 300;
    shaderLoader;
    constructor(device, shaderLoader) {
        this.device = device;
        this.shaderLoader = shaderLoader;
    }
    async createStars() {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./skybox/shaders/stars/vertex.wgsl'),
                this.shaderLoader.loader('./skybox/shaders/stars/frag.wgsl')
            ]);
            const { pos, color, scale, phase, uv } = this.setStars(this.numStars);
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
            this.uvBuffer = this.device.createBuffer({
                size: uv.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
            });
            this.device.queue.writeBuffer(this.uvBuffer, 0, uv);
            this.createUniformBuffers();
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
                            buffer: this.uniformBuffers[0]
                        }
                    }]
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    createUniformBuffers() {
        for (let i = 0; i < 2; i++) {
            this.uniformBuffers.push(this.device.createBuffer({
                size: 16 * 4 + 16,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
            }));
        }
    }
    setStars(count) {
        const pos = new Float32Array(count * 3);
        const color = new Float32Array(count * 3);
        const scale = new Float32Array(count);
        const phase = new Float32Array(count);
        const uv = new Float32Array(count * 2);
        for (let i = 0; i < count; i++) {
            const radius = 50;
            const t = Math.random() * Math.PI * 2;
            const p = Math.acos(2 * Math.random() - 1);
            pos[i * 3] = radius * Math.sin(p) * Math.cos(t);
            pos[i * 3 + 1] = radius * Math.sin(p) * Math.sin(t);
            pos[i * 3 + 2] = radius * Math.cos(p);
            uv[i * 2] = (i % 2) * 2 - 1;
            uv[i * 2 + 1] = Math.floor(i / 2) % 2 * 2 - 1;
            if (Math.random() > 0.2) {
                color[i * 3] = 1.0;
                color[i * 3 + 1] = 1.0;
                color[i * 3 + 2] = 1.0;
            }
            else {
                color[i * 3] = 1.0 + Math.random() * 0.3;
                color[i * 3 + 1] = 0.7 + Math.random() * 0.3;
                color[i * 3 + 2] = 0.6 + Math.random() * 0.3;
            }
            scale[i] = 0.1 + Math.random() * 4;
            phase[i] = Math.random() * Math.PI * 2;
        }
        return {
            pos,
            color,
            scale,
            phase,
            uv
        };
    }
}
