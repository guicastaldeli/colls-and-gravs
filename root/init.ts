import { Tick } from "./tick.js";
import { render } from "./render.js";
import { Input } from "./input.js";
import { loadListData } from "./env/obj/random-blocks/list.js";

export const canvas = <HTMLCanvasElement>(document.querySelector('#content'));
export const context = <GPUCanvasContext>(canvas.getContext('webgpu'));
export let device: GPUDevice;
let tick: Tick;
let input: Input;

function resize(): void {
    const width = window.innerWidth * window.devicePixelRatio;
    const height = window.innerHeight * window.devicePixelRatio;
    canvas.width = Math.max(1, width);
    canvas.height = Math.max(1, height);

    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
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

    resize();
}

async function init(): Promise<void> {
    window.addEventListener('resize', resize);
    await config();

    tick = new Tick();
    tick.getTimeScale();

    await loadListData();
    await render(canvas);

    input = new Input();
    input.lockPointer(canvas);
}

init();