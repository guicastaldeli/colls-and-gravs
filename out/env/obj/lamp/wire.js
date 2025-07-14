import { vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    windManager;
    segments;
    segmentLength;
    constructor(windManager, attachmentPoint, segmentCount, totalLength) {
        this.windManager = windManager;
        this.segments = [];
        this.segmentLength = totalLength / segmentCount;
        for (let i = 0; i < segmentCount; i++) {
            const y = attachmentPoint[1] - i * this.segmentLength;
            this.segments.push(vec3.fromValues(attachmentPoint[0], y, attachmentPoint[2]));
        }
    }
    async drawWire(device, passEncoder, shaderLoader) {
        try {
            const { vertexShader, fragShader } = await this.initShaders(shaderLoader);
            const pipelineLayout = device.createPipelineLayout({
                bindGroupLayouts: []
            });
            const pipeline = device.createRenderPipeline({
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
                    topology: 'line-strip'
                },
                depthStencil: {
                    depthWriteEnabled: true,
                    depthCompare: 'less',
                    format: 'depth24plus'
                }
            });
            const vertices = new Float32Array(this.segments.flat());
            const vertexBuffer = device.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
            vertexBuffer.unmap();
            passEncoder.setPipeline(pipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.draw(this.segments.length);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    getSegments() {
        return this.segments;
    }
    async initShaders(shaderLoader) {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl')
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
    update(deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
        for (let i = 1; i < this.segments.length; i++) {
            vec3.add(this.segments[i], this.segments[i], force);
            this.segments[i][1] -= 0.01;
            const prevSegment = this.segments[i - 1];
            const dir = vec3.create();
            vec3.subtract(dir, this.segments[i], prevSegment);
            const dist = vec3.length(dir);
            if (dist > this.segmentLength) {
                vec3.normalize(dir, dir);
                vec3.scaleAndAdd(this.segments[i], prevSegment, dir, this.segmentLength);
            }
        }
    }
    async init(device, passEncoder, shaderLoader) {
        this.initShaders(shaderLoader);
        this.drawWire(device, passEncoder, shaderLoader);
    }
}
