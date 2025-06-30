import { context, device } from "./init.js";
import { initVertexBuffer } from "./buffers.js";

let pipeline: GPURenderPipeline;
let vertexBuffer: GPUBuffer;

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
                buffers: [{
                    arrayStride: 2 * 4,
                    attributes: [{
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x2'
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
                topology: 'triangle-list'
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

export async function render() {
    try {
        if(!pipeline) console.log('tst');
        await initShaders();
        vertexBuffer = await initVertexBuffer(device);
    
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
    
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        }
    
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline!);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.draw(6),
        passEncoder.end();
    
        device.queue.submit([ commandEncoder.finish() ]);
        requestAnimationFrame(render);
    } catch(err) {
        console.log(err);
        throw err;
    }
}