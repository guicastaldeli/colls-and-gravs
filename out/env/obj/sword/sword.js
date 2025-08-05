import { mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
export class Sword {
    loader;
    pos = {
        x: 7.0,
        y: 0.0,
        z: 7.5
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    constructor(loader) {
        this.loader = loader;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
            ]);
            const sword = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return sword;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setSword() {
        try {
            const x = this.pos.x;
            const y = this.pos.y;
            const z = this.pos.z;
            const position = vec3.fromValues(x, y, z);
            return position;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async update() {
    }
    async init() {
        await this.loadAssets();
        await this.setSword();
    }
}
