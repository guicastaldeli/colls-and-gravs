import { mat4 } from "../node_modules/gl-matrix/esm/index.js";
import { context, device } from "./init.js";
import { initBuffers, drawBuffers } from "./buffers.js";
import { Tick } from "./tick.js";
import { Camera } from "./camera.js";
import { Input } from "./input.js";
import { PlayerController } from "./player-controller.js";
import { EnvRenderer } from "./env/env-renderer.js";
let pipeline;
let buffers;
let tick;
let camera;
let input;
let playerController;
let envRenderer;
async function initShaders() {
    try {
        const [vertexShader, fragShader] = await Promise.all([
            loadShaders('./shaders/vertex.wgsl'),
            loadShaders('./shaders/frag.wgsl')
        ]);
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                        hasDynamicOffset: true
                    }
                }]
        });
        pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [bindGroupLayout]
            }),
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
                cullMode: 'back',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
async function setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime) {
    buffers = await initBuffers(device);
    mat4.identity(modelMatrix);
    mat4.rotateY(modelMatrix, modelMatrix, currentTime / (1000 / tick.getTimeScale()));
    const uniformBuffer = device.createBuffer({
        size: 512,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const bindGroupLayout = pipeline.getBindGroupLayout(0);
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    size: 64
                }
            }]
    });
    await drawBuffers(device, passEncoder, bindGroup, buffers, modelMatrix, buffers.initEnvBuffers, uniformBuffer, viewProjectionMatrix);
    //Renderer
    envRenderer.renderEnv(passEncoder, uniformBuffer, viewProjectionMatrix, bindGroup);
}
async function renderer(device) {
    if (!envRenderer) {
        envRenderer = new EnvRenderer(device);
        await envRenderer.init();
    }
}
async function loadShaders(url) {
    const res = await fetch(url);
    const code = await res.text();
    return device.createShaderModule({ code });
}
export async function render(canvas) {
    try {
        const currentTime = performance.now();
        if (!tick)
            tick = new Tick();
        tick.update(currentTime);
        if (!playerController)
            playerController = new PlayerController();
        if (!camera)
            camera = new Camera(playerController);
        if (!input) {
            input = new Input(camera, playerController);
            input.setupInputControls(canvas);
        }
        if (!pipeline)
            await initShaders();
        await renderer(device);
        const depthTexture = device.createTexture({
            size: [canvas.width, canvas.height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        const renderPassDescriptor = {
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
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
        const viewMatrix = camera.getViewMatrix();
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        const modelMatrix = mat4.create();
        await setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(() => render(canvas));
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
