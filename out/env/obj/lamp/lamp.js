import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Wire } from "./wire.js";
export class Lamp {
    device;
    loader;
    buffers;
    shaderLoader;
    windManager;
    wire;
    position;
    modelMatrix;
    lampPos = {
        x: 3,
        y: 4,
        z: 2
    };
    size = {
        w: 0.1,
        h: 0.1,
        d: 0.1
    };
    constructor(device, loader, shaderLoader, windManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        const attachmentPoint = vec3.fromValues(0, 0, 0);
        this.position = vec3.clone(attachmentPoint);
        this.modelMatrix = mat4.create();
        this.windManager = windManager;
        this.wire = new Wire(windManager, attachmentPoint, 20.0, 10.0);
    }
    getModelMatrix() {
        return this.modelMatrix;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);
            const lamp = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return lamp;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async createLamp() {
        try {
            if (!this.buffers)
                return;
            const position = vec3.fromValues(this.lampPos.x, this.lampPos.y, this.lampPos.z);
            mat4.identity(this.buffers.modelMatrix);
            mat4.translate(this.buffers.modelMatrix, this.buffers.modelMatrix, position);
            mat4.scale(this.buffers.modelMatrix, this.buffers.modelMatrix, [
                this.size.w,
                this.size.h,
                this.size.d
            ]);
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    getBuffers() {
        return this.buffers;
    }
    update(device, deltaTime) {
        this.wire.update(device, deltaTime);
        const wireSegments = this.wire.getSegments();
        vec3.copy(this.position, wireSegments[wireSegments.length - 1]);
        this.createLamp();
    }
    async init() {
        this.buffers = await this.loadAssets();
        await this.wire.init(this.device, this.shaderLoader);
        this.createLamp();
    }
}
