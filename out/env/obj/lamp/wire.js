import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    buffers;
    windManager;
    loader;
    modelMatrix;
    pos = {
        x: 7,
        y: 0,
        z: 0
    };
    size = {
        w: 5.0,
        h: 5.0,
        d: 5.0
    };
    constructor(windManager, loader) {
        this.windManager = windManager;
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);
            const wire = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return wire;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async createWire() {
        try {
            if (!this.buffers)
                return;
            const position = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
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
    async initShaders(shaderLoader) {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl')
            ]);
            return {
                vertexShader,
                fragShader
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    getBuffers() {
        return this.buffers;
    }
    async update(device, deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
    }
    async init(shaderLoader) {
        this.getBuffers();
        this.buffers = await this.loadAssets();
        //this.initShaders(shaderLoader);
        this.createWire();
    }
}
