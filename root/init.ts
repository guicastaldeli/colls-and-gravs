import { render } from "./render.js";

export const canvas = <HTMLCanvasElement>( document.querySelector('#content'));
export const context = <GPUCanvasContext>(canvas.getContext('webgpu'));
export let device: GPUDevice;

function resize(): void {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    document.addEventListener('resize', resize);
}

async function config(): Promise<void> {
    if(!navigator.gpu) throw new Error('err WebGPU');

    const adapter = await navigator.gpu.requestAdapter();
    if(!adapter) throw Error('err adapter');

    device = await adapter.requestDevice();

    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied'
    });
}

async function init(): Promise<void> {
    resize();
    await config();
    await render();
}

init();