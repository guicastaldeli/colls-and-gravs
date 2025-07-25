import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { context, device } from "./init.js";
import { initBuffers } from "./buffers.js";
import { Tick } from "./tick.js";
import { CommandManager } from "./command-manager.js";
import { Camera } from "./camera.js";
import { Input } from "./input.js";
import { Loader } from "./loader.js";
import { ShaderLoader } from "./shader-loader.js";
import { ShaderComposer } from "./shader-composer.js";
import { PlayerController } from "./player/player-controller.js";
import { EnvRenderer } from "./env/env-renderer.js";
import { GetColliders } from "./collision/get-colliders.js";
import { LightningManager } from "./lightning-manager.js";
import { WindManager } from "./wind-manager.js";
import { ObjectManager } from "./env/obj/object-manager.js";
import { ShadowRenderer } from "./lightning/shadow-renderer.js";
import { Skybox } from "./skybox/skybox.js";
import { AmbientLight } from "./lightning/ambient-light.js";
import { DirectionalLight } from "./lightning/directional-light.js";
let pipeline;
let buffers;
let cachedBindGroups = null;
let depthTexture = null;
let depthTextureWidth = 0;
let depthTextureHeight = 0;
let tick;
let commandManager;
let camera;
let input;
let loader;
let shaderLoader;
let shaderComposer;
let playerController;
let envRenderer;
let getColliders;
let hud;
let skybox;
let lightningManager;
let windManager;
let objectManager;
let shadowRenderer;
let wireframeMode = false;
let wireframePipeline = null;
async function initShaders() {
    try {
        const [vertexSrc, fragSrc, ambientLightSrc, directionalLightSrc, pointLightSrc, glowSrc] = await Promise.all([
            shaderLoader.loader('./shaders/vertex.wgsl'),
            shaderLoader.sourceLoader('./shaders/frag.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/ambient-light.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/directional-light.wgsl'),
            shaderLoader.sourceLoader('./lightning/shaders/point-light.wgsl'),
            shaderLoader.sourceLoader('./env/obj/lamp/shaders/glow.wgsl'),
        ]);
        const combinedFragCode = await shaderComposer.combineShader(fragSrc, ambientLightSrc, directionalLightSrc, pointLightSrc, glowSrc);
        return {
            vertexCode: vertexSrc,
            fragCode: combinedFragCode
        };
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
async function setBindGroups() {
    try {
        const bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        hasDynamicOffset: true,
                        minBindingSize: 256
                    }
                }
            ]
        });
        const textureBindGroupLayout = device.createBindGroupLayout({
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
                },
            ]
        });
        const lightningBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 16
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 32
                    }
                }
            ]
        });
        const pointLightBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'uniform' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });
        const shadowBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 64
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform',
                        minBindingSize: 4
                    }
                }
            ]
        });
        return {
            bindGroupLayout,
            textureBindGroupLayout,
            lightningBindGroupLayout,
            pointLightBindGroupLayout,
            shadowBindGroupLayout
        };
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
export async function getBindGroups() {
    if (!cachedBindGroups)
        cachedBindGroups = await setBindGroups();
    return cachedBindGroups;
}
async function initPipeline() {
    try {
        const { vertexCode, fragCode } = await initShaders();
        const fragCodeSrc = shaderComposer.createShaderModule(fragCode);
        const { bindGroupLayout, textureBindGroupLayout, lightningBindGroupLayout, pointLightBindGroupLayout } = await getBindGroups();
        const pipelineLayout = device.createPipelineLayout({
            bindGroupLayouts: [
                bindGroupLayout,
                textureBindGroupLayout,
                lightningBindGroupLayout,
                pointLightBindGroupLayout
            ]
        });
        pipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexCode,
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
                        arrayStride: 8 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 4,
                                offset: 3 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 5,
                                offset: 5 * 4,
                                format: 'float32x3'
                            }
                        ],
                    }
                ]
            },
            fragment: {
                module: fragCodeSrc,
                entryPoint: 'main',
                targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'none',
                frontFace: 'ccw',
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less-equal',
                format: 'depth24plus'
            }
        });
        wireframePipeline = device.createRenderPipeline({
            layout: pipelineLayout,
            vertex: {
                module: vertexCode,
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
                        arrayStride: 8 * 4,
                        attributes: [
                            {
                                shaderLocation: 3,
                                offset: 0,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 4,
                                offset: 3 * 4,
                                format: 'float32x3'
                            },
                            {
                                shaderLocation: 5,
                                offset: 5 * 4,
                                format: 'float32x3'
                            }
                        ],
                    }
                ]
            },
            fragment: {
                module: fragCodeSrc,
                entryPoint: 'main',
                targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
            },
            primitive: {
                topology: 'line-list',
                cullMode: 'none',
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
//Wireframe Mode
async function toggleWireframe() {
    document.addEventListener('keydown', async (e) => {
        if (e.key.toLowerCase() === 't') {
            wireframeMode = !wireframeMode;
            console.log(`Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
            await initPipeline();
        }
    });
}
toggleWireframe();
//
async function getPipeline(passEncoder) {
    const currentPipeline = wireframeMode ? wireframePipeline : pipeline;
    if (!currentPipeline)
        console.error('err pipeline');
    passEncoder.setPipeline(currentPipeline);
}
async function setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime, commandEncoder) {
    buffers = await initBuffers(device);
    mat4.identity(modelMatrix);
    const { bindGroupLayout, textureBindGroupLayout, lightningBindGroupLayout } = await getBindGroups();
    const getRandomBlocks = objectManager.getAllOfType('randomBlocks');
    const randomBlocks = getRandomBlocks.flatMap(rb => rb.getBlocks());
    const renderBuffers = [...await envRenderer.get(), ...randomBlocks];
    const bufferSize = 512 * renderBuffers.length;
    const uniformBuffer = device.createBuffer({
        size: bufferSize * 5,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: 0,
                    size: 256
                }
            }
        ]
    });
    //Pipeline
    await getPipeline(passEncoder);
    //Lightning
    const ambientLightBuffer = lightningManager.getLightBuffer('ambient');
    if (!ambientLightBuffer)
        throw new Error('Ambient light err');
    const directionalLightBuffer = lightningManager.getLightBuffer('directional');
    if (!directionalLightBuffer)
        throw new Error('Directional light err');
    const pointLightBindGroup = lightningManager.getPointLightBindGroup(pipeline);
    if (!pointLightBindGroup)
        throw new Error('Point light err');
    const lightningBindGroup = device.createBindGroup({
        layout: lightningBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: ambientLightBuffer }
            },
            {
                binding: 1,
                resource: { buffer: directionalLightBuffer }
            }
        ]
    });
    //
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        const mvp = mat4.create();
        mat4.multiply(mvp, viewProjectionMatrix, data.modelMatrix);
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, data.modelMatrix);
        const uniformData = new Float32Array(53);
        uniformData.set(mvp, 0);
        uniformData.set(data.modelMatrix, 16);
        uniformData.set(normalMatrix, 32);
        const isLamp = data.isLamp ? data.isLamp[0] > 0 : false;
        uniformData.set(isLamp ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0], 44);
        if (isLamp) {
            uniformData.set([1.0, 1.0, 1.0], 44);
        }
        else {
            uniformData.set([0.0, 0.0, 0.0], 44);
        }
        const cameraPos = camera.playerController.getCameraPosition();
        uniformData.set(cameraPos, 48);
        uniformData.set([currentTime / 1000], 51);
        device.queue.writeBuffer(uniformBuffer, offset, uniformData);
    }
    for (let i = 0; i < renderBuffers.length; i++) {
        const data = renderBuffers[i];
        const offset = 512 * i;
        if (!data.sampler || !data.texture) {
            console.error('missing');
            continue;
        }
        const textureBindGroup = device.createBindGroup({
            layout: textureBindGroupLayout,
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
        passEncoder.setBindGroup(2, lightningBindGroup);
        passEncoder.setBindGroup(3, pointLightBindGroup);
        passEncoder.drawIndexed(data.indexCount);
    }
    const randomBlocksObj = objectManager.getAllOfType('randomBlocks');
    for (const obj of randomBlocksObj) {
        const rb = obj;
        if (rb.targetBlockIndex >= 0) {
            const outline = rb.getBlocks()[rb.targetBlockIndex];
            if (outline) {
                const outlineModelMatrix = mat4.create();
                mat4.copy(outlineModelMatrix, outline.modelMatrix);
                const mvp = mat4.create();
                mat4.multiply(mvp, viewProjectionMatrix, outlineModelMatrix);
                device.queue.writeBuffer(rb.outline.outlineUniformBuffer, 0, mvp);
                passEncoder.setPipeline(rb.outline.outlinePipeline);
                passEncoder.setBindGroup(0, rb.outline.outlineBindGroup);
                passEncoder.setVertexBuffer(0, outline.vertex);
                passEncoder.setIndexBuffer(outline.index, 'uint16');
                passEncoder.drawIndexed(outline.indexCount);
            }
        }
    }
    //Shadows
    const blockToCastShadows = randomBlocks.filter(block => block.position[1] > 0.1);
    if (blockToCastShadows.length > 0) {
        const lightProjection = mat4.ortho(mat4.create(), -10, 10, -10, 10, 0.1, 100);
        const lightView = mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 0], [0, 0, 1]);
        const lightViewProjection = mat4.multiply(mat4.create(), lightProjection, lightView);
        shadowRenderer.updateUniforms(device, lightViewProjection);
        const shadowPassDescriptor = {
            colorAttachments: [],
        };
        const shadowPassEncoder = commandEncoder.beginRenderPass(shadowPassDescriptor);
        shadowPassEncoder.setPipeline(shadowRenderer.pipeline);
        shadowPassEncoder.setBindGroup(0, shadowRenderer.bindGroup);
        for (const block of blockToCastShadows) {
            shadowPassEncoder.setVertexBuffer(0, block.vertex);
            shadowPassEncoder.setIndexBuffer(block.index, 'uint16');
            shadowPassEncoder.drawIndexed(block.indexCount);
        }
        shadowPassEncoder.end();
    }
}
//Color Parser
export function parseColor(rgb) {
    const matches = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
    if (!matches)
        throw new Error('Invalid RGB string or format!');
    return [
        parseInt(matches[1]) / 255,
        parseInt(matches[2]) / 255,
        parseInt(matches[3]) / 255
    ];
}
//Lightning
//Ambient
async function ambientLight() {
    const color = 'rgb(255, 255, 255)';
    const colorArray = parseColor(color);
    const light = new AmbientLight(colorArray, 0.3);
    lightningManager.addAmbientLight('ambient', light);
    lightningManager.updateLightBuffer('ambient');
}
//Directional
async function directionalLight() {
    const pos = {
        x: -10.0,
        y: 5.0,
        z: -15.0
    };
    const color = 'rgb(255, 255, 255)';
    const colorArray = parseColor(color);
    const direction = vec3.fromValues(pos.x, pos.y, pos.z);
    vec3.normalize(direction, direction);
    const light = new DirectionalLight(colorArray, direction, 0.0);
    lightningManager.addDirectionalLight('directional', light);
    lightningManager.updateLightBuffer('directional');
}
//
async function errorHandler() {
    await device.queue.onSubmittedWorkDone();
    const pipelineError = await device.popErrorScope();
    if (pipelineError)
        console.error('Pipeline error:', pipelineError);
}
async function renderEnv(deltaTime) {
    if (!envRenderer) {
        envRenderer = new EnvRenderer(device, loader, shaderLoader, windManager, objectManager);
        await envRenderer.render(deltaTime);
        objectManager.deps.ground = envRenderer.ground;
    }
}
export async function render(canvas) {
    try {
        device.pushErrorScope('validation');
        await errorHandler();
        const currentTime = performance.now();
        if (!tick)
            tick = new Tick();
        const deltaTime = tick.update(currentTime);
        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        //Render Related
        const format = navigator.gpu.getPreferredCanvasFormat();
        if (!loader)
            loader = new Loader(device);
        if (!shaderLoader)
            shaderLoader = new ShaderLoader(device);
        if (!shaderComposer)
            shaderComposer = new ShaderComposer(device);
        if (!pipeline)
            await initPipeline();
        if (depthTexture &&
            (depthTextureWidth !== canvas.width ||
                depthTextureHeight !== canvas.height)) {
            await device.queue.onSubmittedWorkDone();
            depthTexture.destroy();
            depthTexture = null;
        }
        if (!depthTexture) {
            depthTexture = device.createTexture({
                size: [canvas.width, canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
            depthTextureWidth = canvas.width;
            depthTextureHeight = canvas.height;
        }
        const renderPassDescriptor = {
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
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
        passEncoder.setPipeline(pipeline);
        const modelMatrix = mat4.create();
        const viewProjectionMatrix = mat4.create();
        //Lightning
        if (!lightningManager)
            lightningManager = new LightningManager(device);
        await ambientLight();
        await directionalLight();
        //Shadows
        if (!shadowRenderer)
            shadowRenderer = new ShadowRenderer(shaderLoader);
        await shadowRenderer.init(device);
        //Wind
        if (!windManager)
            windManager = new WindManager(tick);
        //Objects
        if (!objectManager) {
            const deps = {
                tick,
                device,
                passEncoder,
                loader,
                shaderLoader,
                ground: envRenderer?.ground,
                lightningManager,
                canvas,
                playerController: null,
                format,
                hud: null,
                windManager,
                viewProjectionMatrix,
                pipeline
            };
            if (!objectManager) {
                objectManager = new ObjectManager(deps);
                await objectManager.ready();
            }
            await renderEnv(deltaTime);
        }
        //
        //Random Blocks
        const randomBlocks = await objectManager.getObject('randomBlocks');
        randomBlocks.update(deltaTime);
        //Colliders
        if (!getColliders)
            getColliders = new GetColliders(envRenderer, randomBlocks);
        //Player Controller
        if (!playerController) {
            playerController = new PlayerController(tick, input, undefined, getColliders);
            objectManager.deps.playerController = playerController;
        }
        playerController.update(deltaTime);
        //Camera
        if (!camera) {
            camera = new Camera(tick, device, pipeline, loader, shaderLoader, playerController, lightningManager);
            await camera.initArm(device, pipeline);
            await camera.initHud(canvas.width, canvas.height);
        }
        if (camera)
            camera.update(deltaTime);
        if (!input) {
            input = new Input(tick, camera, playerController);
            input.setupInputControls(canvas);
        }
        if (camera) {
            hud = camera.getHud();
            hud.update(canvas.width, canvas.height);
            camera.getProjectionMatrix(canvas.width / canvas.height);
        }
        //
        //Commands
        if (!commandManager && input &&
            playerController && randomBlocks) {
            commandManager = new CommandManager(canvas, input, playerController, randomBlocks);
            commandManager.init();
        }
        const projectionMatrix = camera.getProjectionMatrix(canvas.width / canvas.height);
        const viewMatrix = camera.getViewMatrix();
        mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix);
        await setBuffers(passEncoder, viewProjectionMatrix, modelMatrix, currentTime, commandEncoder);
        //Late Renderers
        //Skybox
        if (!skybox) {
            skybox = new Skybox(tick, device, shaderLoader);
            await skybox.init();
        }
        await skybox.render(passEncoder, viewProjectionMatrix, deltaTime);
        //Render Arm
        if (camera && pipeline) {
            camera.renderArm(device, pipeline, passEncoder, canvas);
        }
        //Render Hud
        camera.renderHud(passEncoder);
        //Random Blocks
        if (randomBlocks)
            randomBlocks.init(canvas, playerController, format, hud);
        //
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(() => render(canvas));
    }
    catch (err) {
        console.log(err);
        throw err;
    }
}
