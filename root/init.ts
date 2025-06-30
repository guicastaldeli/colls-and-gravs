import { render } from "./render.js";

export const canvas = <HTMLCanvasElement>( document.querySelector('#content'));
export const context = <GPUCanvasContext>(canvas.getContext('webgpu'));
export let device: GPUDevice;

function resize(): void {
    const width = window.innerWidth * window.devicePixelRatio;
    const height = window.innerHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    
    window.addEventListener('resize', resize);
}

async function config(): Promise<void> {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
    await render(canvas);
}

init();