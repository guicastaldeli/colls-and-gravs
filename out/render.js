var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { context, device } from "./init.js";
import { initVertexBuffer } from "./buffers.js";
let pipeline;
let vertexBuffer;
function initShaders() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const [vertexShader, fragShader] = yield Promise.all([
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
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    });
}
function loadShaders(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(url);
        const code = yield res.text();
        return device.createShaderModule({ code });
    });
}
export function render() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!pipeline)
                console.log('tst');
            yield initShaders();
            vertexBuffer = yield initVertexBuffer(device);
            const commandEncoder = device.createCommandEncoder();
            const textureView = context.getCurrentTexture().createView();
            const renderPassDescriptor = {
                colorAttachments: [{
                        view: textureView,
                        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                        loadOp: 'clear',
                        storeOp: 'store'
                    }]
            };
            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            passEncoder.setPipeline(pipeline);
            passEncoder.setVertexBuffer(0, vertexBuffer);
            passEncoder.draw(6),
                passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
            requestAnimationFrame(render);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    });
}
