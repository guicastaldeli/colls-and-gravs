import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Wire {
    buffers;
    loader;
    segments = [];
    segmentLength = 1.0;
    segmentCount = 1;
    totalLength = this.segmentLength * this.segmentCount;
    pos = {
        x: 7.0,
        y: 4.0,
        z: 7.5
    };
    size = {
        w: 0.4,
        h: 0.4 + this.totalLength,
        d: 0.4
    };
    constructor(loader) {
        this.loader = loader;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./.assets/env/obj/wire.obj'),
                this.loader.textureLoader('./.assets/env/textures/wire.png')
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
            const x = this.pos.x;
            const y = this.pos.y + 1.0;
            const z = this.pos.z;
            const position = vec3.fromValues(x, y + (i * this.segmentLength), z);
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
    async init() {
        const buffers = await this.loadAssets();
        for (let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i);
            this.segments.push(segment);
        }
    }
}
