import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData, initEnvBuffers } from "../../env-buffers.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Wire } from "./wire.js";

export class Lamp {
    private device: GPUDevice;
    private loader: Loader;
    private shaderLoader: ShaderLoader;

    private windManager: WindManager;
    private wire: Wire;

    private position: vec3;
    private modelMatrix: mat4;

    lampPos = {
        x: 0,
        y: 0,
        z: 0
    }

    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    }

    constructor(
        device: GPUDevice,
        loader: Loader,
        shaderLoader: ShaderLoader,
        windManager: WindManager,
        attachmentPoint: vec3
    ) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;

        this.position = vec3.clone(attachmentPoint);
        this.modelMatrix = mat4.create();
        
        this.windManager = windManager;
        this.wire = new Wire(
            windManager,
            attachmentPoint,
            10,
            2.0
        );
    }

    public getModelMatrix(): mat4 {
        return this.modelMatrix;
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);

            const lamp: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            }

            return lamp;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async createLamp(): Promise<void> {
        try {
            const lamp = await this.loadAssets();

            const position = vec3.fromValues(this.lampPos.x, this.lampPos.y, this.lampPos.z);
            mat4.identity(lamp.modelMatrix);
            mat4.translate(lamp.modelMatrix, lamp.modelMatrix, position);
            
            mat4.scale(
                lamp.modelMatrix,
                lamp.modelMatrix,
                [
                    this.size.w,
                    this.size.h,
                    this.size.d
                ]
            )
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async render(passEncoder: GPURenderPassEncoder): Promise<void> {
        this.wire.init(this.device, passEncoder, this.shaderLoader);
        await this.createLamp();
    }

    public update(deltaTime: number) {
        this.wire.update(deltaTime);

        const wireSegments = this.wire.getSegments();
        vec3.copy(this.position, wireSegments[wireSegments.length - 1]);

        this.createLamp();
    }
}