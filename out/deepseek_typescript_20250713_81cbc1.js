import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
export class DirectionalLightHelper {
    device;
    pipeline;
    vertexBuffer;
    indexBuffer;
    uniformBuffer;
    bindGroup;
    vertices;
    indices;
    color;
    constructor(device, color = vec3.fromValues(1.0, 1.0, 0.5)) {
        this.device = device;
        this.color = color;
        // Define geometry: arrow body + head for direction visualization
        this.vertices = new Float32Array([
            // Arrow body (line)
            0, 0, 0, // 0 - start
            0, 0, -1, // 1 - end
            // Arrow head (pyramid base)
            0.1, 0.1, -0.8, // 2
            -0.1, 0.1, -0.8, // 3
            -0.1, -0.1, -0.8, // 4
            0.1, -0.1, -0.8, // 5
            // Arrow head tip
            0, 0, -1.2 // 6
        ]);
        // Define edges and triangles
        this.indices = new Uint16Array([
            // Arrow body
            0, 1,
            // Arrow head base
            2, 3, 3, 4, 4, 5, 5, 2,
            // Arrow head sides
            2, 6, 3, 6, 4, 6, 5, 6
        ]);
        this.createBuffers();
    }
    createBuffers() {
        // Create vertex buffer
        this.vertexBuffer = this.device.createBuffer({
            size: this.vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(this.vertexBuffer.getMappedRange()).set(this.vertices);
        this.vertexBuffer.unmap();
        // Create index buffer
        this.indexBuffer = this.device.createBuffer({
            size: this.indices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Uint16Array(this.indexBuffer.getMappedRange()).set(this.indices);
        this.indexBuffer.unmap();
        // Create uniform buffer for model matrix and color
        this.uniformBuffer = this.device.createBuffer({
            size: (16 + 4) * 4, // mat4 + vec3 + padding
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }
    async initPipeline() {
        const shaderCode = `
            struct Uniforms {
                mvpMatrix: mat4x4<f32>,
                color: vec3<f32>,
            };
            
            @group(0) @binding(0) var<uniform> uniforms: Uniforms;
            
            struct VertexOutput {
                @builtin(position) position: vec4<f32>,
                @location(0) color: vec3<f32>,
            };
            
            @vertex
            fn vs_main(
                @location(0) position: vec3<f32>,
            ) -> VertexOutput {
                var output: VertexOutput;
                output.position = uniforms.mvpMatrix * vec4<f32>(position, 1.0);
                output.color = uniforms.color;
                return output;
            }
            
            @fragment
            fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                return vec4<f32>(input.color, 1.0);
            }
        `;
        const shaderModule = this.device.createShaderModule({ code: shaderCode });
        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                }]
        });
        const pipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        });
        this.pipeline = this.device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: shaderModule,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 3 * 4, // 3 floats (x,y,z)
                        attributes: [{
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            }]
                    }]
            },
            fragment: {
                module: shaderModule,
                entryPoint: 'fs_main',
                targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
            },
            primitive: {
                topology: 'line-list',
                lineWidth: 2
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
        this.bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                }]
        });
    }
    render(passEncoder, viewProjectionMatrix, lightPosition, lightDirection, lightColor) {
        // Create model matrix that orients the arrow to point in light direction
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, lightPosition);
        // Calculate rotation to align with light direction
        const up = vec3.fromValues(0, 1, 0);
        const target = vec3.create();
        vec3.add(target, lightPosition, lightDirection);
        mat4.targetTo(modelMatrix, lightPosition, target, up);
        // Scale based on light intensity or scene size
        const scale = 2.0; // Adjust based on your scene scale
        mat4.scale(modelMatrix, modelMatrix, [scale, scale, scale]);
        // Calculate final MVP matrix
        const mvpMatrix = mat4.create();
        mat4.multiply(mvpMatrix, viewProjectionMatrix, modelMatrix);
        // Create uniform data (matrix + color)
        const uniformData = new Float32Array(16 + 4);
        uniformData.set(mvpMatrix, 0);
        uniformData.set(lightColor || this.color, 16);
        // Update uniform buffer
        this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData.buffer, uniformData.byteOffset, uniformData.byteLength);
        // Set pipeline and buffers
        passEncoder.setPipeline(this.pipeline);
        passEncoder.setBindGroup(0, this.bindGroup);
        passEncoder.setVertexBuffer(0, this.vertexBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint16');
        // Draw the light helper
        passEncoder.drawIndexed(this.indices.length);
    }
}
