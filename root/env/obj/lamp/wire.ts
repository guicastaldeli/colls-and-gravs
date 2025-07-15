import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Loader } from "../../../loader.js";
import { EnvBufferData } from "../../env-buffers.js";

interface Shaders {
    vertexShader: GPUShaderModule;
    fragShader: GPUShaderModule;
}

export class Wire {
    private buffers?: EnvBufferData;
    private windManager: WindManager;
    private loader: Loader;
    private modelMatrix: mat4;

    pos = {
        x: 7,
        y: 0,
        z: 0
    }

    size = {
        w: 5.0,
        h: 5.0,
        d: 5.0
    }

    constructor(windManager: WindManager, loader: Loader) {
        this.windManager = windManager;
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
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

    private async createWire(): Promise<void> {
        try {
            if(!this.buffers) return;

            const position = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
            mat4.identity(this.buffers.modelMatrix);
            mat4.translate(this.buffers.modelMatrix, this.buffers.modelMatrix, position);
            
            mat4.scale(
                this.buffers.modelMatrix,
                this.buffers.modelMatrix,
                [
                    this.size.w,
                    this.size.h,
                    this.size.d
                ]
            );
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async initShaders(shaderLoader: ShaderLoader): Promise<Shaders> {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl')
            ]);

            return {
                vertexShader,
                fragShader
            }
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    public getBuffers(): EnvBufferData | undefined {
        return this.buffers;
    }

    public async update(device: GPUDevice, deltaTime: number): Promise<void> {
        const force = this.windManager.getWindForce(deltaTime);
    }

    public async init(shaderLoader: ShaderLoader): Promise<void> {
        this.getBuffers();
        this.buffers = await this.loadAssets();
        //this.initShaders(shaderLoader);
        this.createWire();
    }
}