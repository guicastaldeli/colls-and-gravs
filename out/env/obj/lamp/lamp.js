import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Wire } from "./wire.js";
export class Lamp {
    device;
    loader;
    shaderLoader;
    windManager;
    wire;
    position;
    modelMatrix;
    lampPos = {
        x: 0,
        y: 0,
        z: 0
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    constructor(device, loader, shaderLoader, windManager, attachmentPoint) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.position = vec3.clone(attachmentPoint);
        this.modelMatrix = mat4.create();
        this.windManager = windManager;
        this.wire = new Wire(windManager, attachmentPoint, 10, 2.0);
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
            const lamp = await this.loadAssets();
            const position = vec3.fromValues(this.lampPos.x, this.lampPos.y, this.lampPos.z);
            mat4.identity(lamp.modelMatrix);
            mat4.translate(lamp.modelMatrix, lamp.modelMatrix, position);
            mat4.scale(lamp.modelMatrix, lamp.modelMatrix, [
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
    async render(passEncoder) {
        this.wire.init(this.device, passEncoder, this.shaderLoader);
        await this.createLamp();
    }
    update(deltaTime) {
        this.wire.update(deltaTime);
        const wireSegments = this.wire.getSegments();
        vec3.copy(this.position, wireSegments[wireSegments.length - 1]);
        this.createLamp();
    }
}
