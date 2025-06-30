import { Tick } from "./tick.js";
import { render } from "./render.js";
export const canvas = (document.querySelector('#content'));
export const context = (canvas.getContext('webgpu'));
export let device;
let tick;
function resize() {
    const width = window.innerWidth * window.devicePixelRatio;
    const height = window.innerHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    window.addEventListener('resize', resize);
}
async function config() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!navigator.gpu)
        throw new Error('err WebGPU');
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
        throw Error('err adapter');
    device = await adapter.requestDevice();
    context.configure({
        device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied'
    });
}
async function init() {
    resize();
    await config();
    tick = new Tick();
    tick.getTimeScale();
    await render(canvas);
}
init();
