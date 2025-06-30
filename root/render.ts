import { mat4 } from "../node_modules/gl-matrix/esm/index.js";

import { context, device } from "./init.js";
import { BufferData } from "./buffers.js";
import { initBuffers } from "./buffers.js";

import { Camera } from "./camera.js";
import { Input } from "./input.js";

let pipeline: GPURenderPipeline;
let buffers: BufferData;

let camera: Camera;
let input: Input;

async function initShaders(): Promise<void> {
    try {
        const [vertexShader, fragShader] = await Promise.all([
            loadShaders('./shaders/vertex.wgsl'),
            loadShaders('./shaders/frag.wgsl')
        ]);

        pipeline = device.createRenderPipeline({
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
                topology: 'triangle-list',
                cullMode: 'back'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
    } catch(err) {
        console.log(err);
        throw err;
    }
}

async function loadShaders(url: string): Promise<GPUShaderModule> {
    const res = await fetch(url);
    const code = await res.text();
    return device.createShaderModule({ code });
}

export async function render(canvas: HTMLCanvasElement): Promise<void> {
    try {
        if(!camera) camera = new Camera();
        if(!input) {
            input = new Input();
            input.setupInputControls(canvas, camera);
        }
        if(!pipeline) await initShaders();
        buffers = await initBuffers(device);

        const uniformBufferSize = 2 * 4 * 16;
        const uniformBuffer = device.createBuffer({
            size: uniformBufferSize,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = pipeline.getBindGroupLayout(0);
        const bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }]
        });

        const depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
    
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
    
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        }
    
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, buffers.vertex);
        passEncoder.setVertexBuffer(1, buffers.color);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.setIndexBuffer(buffers.index, 'uint16');
        passEncoder.drawIndexed(buffers.indexCount);

        const viewMatrix = camera.getViewMatrix();
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);

        const modelMatrix = mat4.create();
        mat4.rotateY(modelMatrix, modelMatrix, performance.now() / 1000);

        device.queue.writeBuffer(uniformBuffer, 0.0, viewProjectionMatrix as Float32Array);
        device.queue.writeBuffer(uniformBuffer, 4 * 16, modelMatrix as Float32Array);

        passEncoder.end();    
        device.queue.submit([ commandEncoder.finish() ]);
        requestAnimationFrame(() => render(canvas));
    } catch(err) {
        console.log(err);
        throw err;
    }
}