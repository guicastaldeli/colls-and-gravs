var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { render } from "./render.js";
export const canvas = (document.querySelector('#content'));
export const context = (canvas.getContext('webgpu'));
export let device;
function resize() {
    const width = window.innerWidth * window.devicePixelRatio;
    const height = window.innerHeight * window.devicePixelRatio;
    canvas.width = width;
    canvas.height = height;
    window.addEventListener('resize', resize);
}
function config() {
    return __awaiter(this, void 0, void 0, function* () {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (!navigator.gpu)
            throw new Error('err WebGPU');
        const adapter = yield navigator.gpu.requestAdapter();
        if (!adapter)
            throw Error('err adapter');
        device = yield adapter.requestDevice();
        context.configure({
            device,
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: 'premultiplied'
        });
    });
}
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        resize();
        yield config();
        yield render(canvas);
    });
}
init();
