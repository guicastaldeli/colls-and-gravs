var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export function initBuffers(device) {
    return __awaiter(this, void 0, void 0, function* () {
        const vertexBuffer = yield initVertexBuffer(device);
        const colorBuffer = yield initColorBuffer(device);
        return {
            vertex: vertexBuffer,
            color: colorBuffer
        };
    });
}
function initVertexBuffer(device) {
    return __awaiter(this, void 0, void 0, function* () {
        const vertices = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            0.5, 0.5
        ]);
        const vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
        vertexBuffer.unmap();
        return vertexBuffer;
    });
}
function initColorBuffer(device) {
    return __awaiter(this, void 0, void 0, function* () {
        const colors = new Float32Array([
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 1.0, 0.0,
            1.0, 1.0, 0.0
        ]);
        const colorBuffer = device.createBuffer({
            size: colors.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true
        });
        new Float32Array(colorBuffer.getMappedRange()).set(colors);
        colorBuffer.unmap();
        return colorBuffer;
    });
}
