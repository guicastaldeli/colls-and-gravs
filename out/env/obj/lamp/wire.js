import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    buffers;
    windManager;
    loader;
    segments = [];
    segmentLength = 1.0;
    segmentCount = 10;
    totalLength = this.segmentLength * this.segmentCount;
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
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/wire.obj'),
                this.loader.textureLoader('./assets/env/textures/wire.png')
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
    async createWire(baseBuffer, i) {
        try {
            const segmentBuffer = { ...baseBuffer, modelMatrix: mat4.create() };
            const position = vec3.fromValues(this.pos.x, this.pos.y + (i * this.segmentLength), this.pos.z);
            mat4.translate(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, position);
            mat4.scale(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, [
                this.size.w,
                this.size.h,
                this.size.d
            ]);
            return segmentBuffer;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async getBuffers() {
        return this.segments;
    }
    async update(device, deltaTime) {
        const force = this.windManager.getWindForce(deltaTime);
    }
    async init() {
        const buffers = await this.loadAssets();
        for (let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i);
            this.segments.push(segment);
        }
    }
}
