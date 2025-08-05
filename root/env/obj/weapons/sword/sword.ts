import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../../object-manager.js";
import { Loader } from "../../../../loader.js";
import { EnvBufferData } from "../../../env-buffers.js";

@Injectable()
export class Sword {
    private loader: Loader;

    private pos = {
        x: 7.0,
        y: 0.0,
        z: 7.5
    }

    private size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    constructor(loader: Loader) {
        this.loader = loader;
        console.log(this.loader)
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
            ]);

            const sword: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return sword;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async setSword(): Promise<vec3> {
        try {
            const x = this.pos.x;
            const y = this.pos.y;
            const z = this.pos.z;
            const position = vec3.fromValues(x, y, z);
            return position;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async update(): Promise<void> {

    }

    public async init(): Promise<void> {
        await this.loadAssets();
        await this.setSword();
    }
}