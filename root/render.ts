import { mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";

import { context, device } from "./init.js";
import { initBuffers, drawBuffers } from "./buffers.js";
import { BufferData } from "./buffers.js";

import { Tick } from "./tick.js";
import { Camera } from "./camera.js";
import { Input } from "./input.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";
import { PlayerController } from "./player-controller.js";
import { EnvRenderer } from "./env/env-renderer.js";
import { GetColliders } from "./get-colliders.js";
import { ICollidable } from "./collider.js";

import { RandomBlocks } from "./env/random-blocks/random-blocks.js";

let pipeline: GPURenderPipeline;
let buffers: BufferData;

let tick: Tick;
let camera: Camera;
let input: Input;
let loader: Loader;
let shaderLoader: ShaderLoader;
let playerController: PlayerController;
let envRenderer: EnvRenderer;
let getColliders: GetColliders;

let wireframeMode = false;
let wireframePipeline: GPURenderPipeline | null = null; 

let randomBlocks: RandomBlocks;

async function toggleWireframe(): Promise<void> {
    document.addEventListener('keydown', async (e) => {
        if(e.key.toLowerCase() === 't') {
            wireframeMode = !wireframeMode;
            console.log(`Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
            await initShaders();
        }
    });
}

toggleWireframe();

async function initShaders(): Promise<void> {
    try {
        const [vertexShader, fragShader] = await Promise.all([
            shaderLoader.loader('./shaders/vertex.wgsl'),
            shaderLoader.loader('./shaders/frag.wgsl')
        ]);

        const bindGroupLayouts = [
            device.createBindGroupLayout({
                entries: [{
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                        hasDynamicOffset: true,
                        minBindingSize: 256
                    }
                }]
            }),
            device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {}
                    }
                ]
            }),
        ]

        pipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: bindGroupLayouts
            }),
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [
                    {
                        arrayStride: 8 * 4,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 1,
                                offset: 3 * 4,
                                format: 'float32x2'
                            },
                            {
                                shaderLocation: 2,
                                offset: 5 * 4,
                                format: 'float32x3'
                            }
                        ]
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            }
                        ]
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
                frontFace: 'ccw',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            }
        });

        wireframePipeline = device.createRenderPipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: bindGroupLayouts
            }),
            vertex: {
                module: vertexShader,
                entryPoint: 'main',
                buffers: [
                    {
                        arrayStride: 8 * 4,
                        attributes: [
                            {
                                shaderLocation: 0,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 1,
                                offset: 3 * 4,
                                format: 'float32x2'
                            },
                            {
                                shaderLocation: 2,
                                offset: 5 * 4,
                                format: 'float32x3'
                            }
                        ]
                    },
                    {
                        arrayStride: 3 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            }
                        ]
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
                topology: 'line-list',
                cullMode: 'back',
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

async function setBuffers(
    passEncoder: GPURenderPassEncoder,
    viewProjectionMatrix: mat4,
    modelMatrix: mat4,
    currentTime: number,
) {
    buffers = await initBuffers(device);
    mat4.identity(modelMatrix);

    const renderBuffers = [...randomBlocks.getBlocks(), ...envRenderer.ground.getBlocks()];
    const uniformBuffer = device.createBuffer({
        size: 256 * (1 + renderBuffers.length),
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = pipeline.getBindGroupLayout(0);
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: uniformBuffer,
                size: 256
            }
        }]
    });

    passEncoder.setPipeline(wireframeMode ? wireframePipeline! : pipeline);

    for(let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 256 * i;
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjectionMatrix, renderBuffers[i].modelMatrix);

        device.queue.writeBuffer(uniformBuffer, offset, mvp as Float32Array);
        
        if(!data.sampler || !data.texture) {
            console.error('missing');
            continue;
        }
        
        const textureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: data.sampler
                },
                {
                    binding: 1,
                    resource: data.texture.createView()
                }
            ]
        });
        
        passEncoder.setVertexBuffer(0, data.vertex);
        passEncoder.setVertexBuffer(1, data.color);
        passEncoder.setIndexBuffer(data.index, 'uint16');
        passEncoder.setBindGroup(0, bindGroup, [offset]);
        passEncoder.setBindGroup(1, textureBindGroup);
        passEncoder.drawIndexed(data.indexCount);
    }
    
    if(randomBlocks.targetBlockIndex >= 0) {
        const outline = randomBlocks.getBlocks()[randomBlocks.targetBlockIndex];
        
        if(outline) {
            const outlineModelMatrix = mat4.create();
            mat4.copy(outlineModelMatrix, outline.modelMatrix);

            const mvp = mat4.create();
            mat4.multiply(mvp, viewProjectionMatrix, outlineModelMatrix);

            device.queue.writeBuffer(randomBlocks.outline.outlineUniformBuffer, 0, mvp as Float32Array);
            passEncoder.setPipeline(randomBlocks.outline.outlinePipeline);
            passEncoder.setBindGroup(0, randomBlocks.outline.outlineBindGroup);
            passEncoder.setVertexBuffer(0, outline.vertex);
            passEncoder.setIndexBuffer(outline.index, 'uint16');
            passEncoder.drawIndexed(outline.indexCount);
        }
    }
}

async function renderer(device: GPUDevice): Promise<void> {
    if(!envRenderer) {
        envRenderer = new EnvRenderer(device, loader);
        await envRenderer.init();
    }
}

export async function render(canvas: HTMLCanvasElement): Promise<void> {
    try {
        const currentTime = performance.now();
        if(!tick) tick = new Tick();
        const deltaTime = tick.update(currentTime);
        
        //Render Related
        if(!loader) loader = new Loader(device);
        if(!shaderLoader) shaderLoader = new ShaderLoader(device);
        if(!pipeline) await initShaders();
        await renderer(device);

        //Random Blocks
        const format = navigator.gpu.getPreferredCanvasFormat();
        if(!randomBlocks) randomBlocks = new RandomBlocks(tick, device, loader, shaderLoader, envRenderer.ground);
        if(deltaTime) randomBlocks.update(deltaTime);

        //Colliders
        if(!getColliders) getColliders = new GetColliders(envRenderer, randomBlocks);

        //Player Controller
        if(!playerController) playerController = new PlayerController(tick, undefined, getColliders);
        playerController.update(deltaTime);

        //Camera
            if(!camera) {
                camera = new Camera(
                    device, 
                    pipeline, 
                    loader, 
                    shaderLoader, 
                    playerController
                );

                await camera.initHud(canvas.width, canvas.height);
            }
            if(!input) {
                input = new Input(tick, camera, playerController);
                input.setupInputControls(canvas);
            }
            const hud = camera.getHud();
            hud.update(canvas.width, canvas.height);
            camera.getProjectionMatrix(canvas.width / canvas.height);
        //
            
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
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            }
        }
        
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
    
        const modelMatrix = mat4.create();
        const viewMatrix = camera.getViewMatrix();
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewProjectionMatrix = mat4.create();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        await setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime);

        //Render Hud
        camera.renderHud(passEncoder);

        //Random Blocks
        if(randomBlocks) randomBlocks.init(canvas, playerController, format, hud);

        passEncoder.end();    
        device.queue.submit([ commandEncoder.finish() ]);
        requestAnimationFrame(() => render(canvas));
    } catch(err) {
        console.log(err);
        throw err;
    }
}