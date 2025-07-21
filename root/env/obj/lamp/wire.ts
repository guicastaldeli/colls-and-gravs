import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Loader } from "../../../loader.js";
import { EnvBufferData } from "../../env-buffers.js";

export class Wire {
    private buffers?: EnvBufferData;
    private windManager: WindManager;
    private loader: Loader;

    private segments: EnvBufferData[] = [];
    private segmentLength: number = 1.0;
    private segmentCount: number = 1;
    private totalLength: number = this.segmentLength * this.segmentCount; 

    public pos = {
        x: 7.0,
        y: 4.0,
        z: 7.5
    }

    size = {
        w: 0.4,
        h: 0.4 + this.totalLength,
        d: 0.4
    }

    constructor(windManager: WindManager, loader: Loader) {
        this.windManager = windManager;
        this.loader = loader;
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/wire.obj'),
                this.loader.textureLoader('./assets/env/textures/wire.png')
            ]);

            const wire: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return wire;
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async createWire(baseBuffer: EnvBufferData, i: number): Promise<EnvBufferData> {
        try {
            const segmentBuffer = { ...baseBuffer, modelMatrix: mat4.create() };

            const x = this.pos.x;
            const y = this.pos.y + 1.0;
            const z = this.pos.z;

            const position = vec3.fromValues(
                x,
                y + (i * this.segmentLength),
                z
            );

            mat4.translate(segmentBuffer.modelMatrix, segmentBuffer.modelMatrix, position);
            mat4.scale(
                segmentBuffer.modelMatrix,
                segmentBuffer.modelMatrix,
                [
                    this.size.w,
                    this.size.h,
                    this.size.d
                ]
            );

            return segmentBuffer;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async getBuffers(): Promise<EnvBufferData[] | undefined> {
        return this.segments;
    }

    public async update(device: GPUDevice, deltaTime: number): Promise<void> {
        const force = this.windManager.getWindForce(deltaTime);
    }

    public async init(): Promise<void> {
        const buffers = await this.loadAssets();
        for(let i = 0; i < this.segmentCount; i++) {
            const segment = await this.createWire(buffers, i)
            this.segments.push(segment);
        }
    }
}