import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class Hud {
    device;
    pipeline;
    loader;
    shaderLoader;
    texture;
    sampler;
    transformBuffer;
    buffers;
    constructor(device, pipeline, loader, shaderLoader) {
        this.device = device;
        this.pipeline = pipeline;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
    }
    async drawCrosshair(w, h) {
        const screenAspectRatio = w / h;
        const crosshairSize = 0.025;
        const halfHeight = crosshairSize / 2;
        const halfWidth = (crosshairSize / 2) / screenAspectRatio;
        const vertices = new Float32Array([
            -halfWidth, -halfHeight, 1,
            halfWidth, -halfHeight, 1,
            halfWidth, halfHeight, 1,
            -halfWidth, halfHeight, 1
        ]);
        const uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        this.buffers = {
            vertex: this.device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            }),
            uv: this.device.createBuffer({
                size: uvs.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            }),
            index: this.device.createBuffer({
                size: indices.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            })
        };
        new Float32Array(this.buffers.vertex.getMappedRange()).set(vertices);
        this.buffers.vertex.unmap();
        new Float32Array(this.buffers.uv.getMappedRange()).set(uvs);
        this.buffers.uv.unmap();
        new Uint16Array(this.buffers.index.getMappedRange()).set(indices);
        this.buffers.index.unmap();
        this.crosshairScale(w, h);
    }
    crosshairScale(w, h) {
        const refWidth = 808;
        const refHeight = 460;
        const widthRatio = w / refWidth;
        const heightRatio = h / refHeight;
        const maxRatio = Math.max(widthRatio, heightRatio);
        const baseScale = 3.0;
        const minScale = 1.0;
        let dynamicScale = baseScale;
        if (maxRatio > 1.0) {
            dynamicScale = baseScale / maxRatio;
            dynamicScale = Math.max(minScale, dynamicScale);
        }
        const transform = mat4.create();
        mat4.scale(transform, transform, [dynamicScale, dynamicScale, 1]);
        if (this.transformBuffer)
            this.transformBuffer.destroy();
        this.transformBuffer = this.device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const mvpArray = new Float32Array(transform);
        this.device.queue.writeBuffer(this.transformBuffer, 0, mvpArray);
    }
    async initShaders() {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./.shaders/hud/vertex.wgsl'),
                this.shaderLoader.loader('./.shaders/hud/frag.wgsl')
            ]);
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
                            arrayStride: 2 * 4,
                            attributes: [{
                                    shaderLocation: 1,
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
                    topology: 'triangle-list'
                },
                depthStencil: {
                    depthWriteEnabled: false,
                    depthCompare: 'always',
                    format: 'depth24plus'
                }
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async render(passEncoder) {
        try {
            if (!this.pipeline || !this.texture)
                return;
            const bindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: this.sampler
                    },
                    {
                        binding: 1,
                        resource: this.texture.createView()
                    }
                ]
            });
            const transformBindGroup = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(1),
                entries: [{
                        binding: 0,
                        resource: {
                            buffer: this.transformBuffer
                        }
                    }]
            });
            passEncoder.setPipeline(this.pipeline);
            passEncoder.setBindGroup(0, bindGroup);
            passEncoder.setBindGroup(1, transformBindGroup);
            passEncoder.setVertexBuffer(0, this.buffers.vertex);
            passEncoder.setVertexBuffer(1, this.buffers.uv);
            passEncoder.setIndexBuffer(this.buffers.index, 'uint16');
            passEncoder.drawIndexed(6);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    getCrosshairWorldPos(cameraPosition, cameraForward, distance) {
        const worldPos = vec3.create();
        vec3.scaleAndAdd(worldPos, cameraPosition, cameraForward, distance);
        return worldPos;
    }
    async update(w, h) {
        this.crosshairScale(w, h);
    }
    async init(w, h) {
        try {
            this.texture = await this.loader.textureLoader('./.assets/hud/crosshair.png');
            await this.drawCrosshair(w, h);
            await this.initShaders();
            this.sampler = this.device.createSampler({
                magFilter: 'nearest',
                minFilter: 'nearest'
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
