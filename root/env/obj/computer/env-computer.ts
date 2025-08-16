import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { AsmLoader } from "../../../asm-loader.js";
import { Computer } from "../../../assembler/computer.js";
import { Loader } from "../../../loader.js";
import { EnvBufferData } from "../../env-buffers.js";
import { Injectable } from "../object-manager.js";

@Injectable()
export class EnvComputer {
    private computer: Computer;
    private asmLoader: AsmLoader;
    private loader: Loader;
    private displayTexture!: GPUTexture;
    private buffers!: EnvBufferData;
    private modelMatrix: mat4;
    private isInit: boolean = false;

    private pos = {
        x: 5.0,
        y: 0.0,
        z: 5.0
    }

    private size = {
        w: 1.5,
        h: 1.5,
        d: 1.0
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.computer = new Computer(device);
        this.asmLoader = new AsmLoader();
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }

    private async loadAssets(): Promise<EnvBufferData> {
        try {
            const [model] = await Promise.all([
                this.loader.parser('./.assets/env/obj/smile.obj'),
                this.loadProgram()
            ]);

            const lamp: EnvBufferData = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: mat3.create(),
                texture: this.displayTexture,
                sampler: this.loader.createSampler(),
                isLamp: [1.0, 1.0, 1.0],
                isEmissive: [0.0, 0.0, 0.0]
            }

            return lamp;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async loadProgram(): Promise<void> {
        try {
            const path: string = './assembler/program.asm';
            const code = await this.asmLoader.loader(path);
            this.computer.loadAssembly(code);
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    private async setComputer(): Promise<void> {
        try {
            const position = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
            const scale = vec3.fromValues(this.size.w, this.size.h, this.size.d);
            mat4.identity(this.modelMatrix);
            mat4.translate(this.modelMatrix, this.modelMatrix, position);
            mat4.scale(this.modelMatrix, this.modelMatrix, scale);
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async getBuffers(): Promise<EnvBufferData | undefined> {
        if(!this.isInit) throw new Error('not init yet!');

        try {
            await this.setComputer();

            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, this.buffers.modelMatrix);
            this.buffers.normalMatrix = normalMatrix;

            const buffers: EnvBufferData = {
                vertex: this.buffers.vertex,
                color: this.buffers.color,
                index: this.buffers.index,
                indexCount: this.buffers.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: normalMatrix,
                texture: this.displayTexture,
                sampler: this.loader.createSampler(),
                isLamp: [0.0, 0.0, 0.0],
                isEmissive: [0.0, 0.0, 0.0]
            }

            return buffers;
        } catch(err) {
            console.error('Err computer', err);
            throw err;
        }
    }

    public async update(cycles: number): Promise<void> {
        this.computer.run(cycles);
        this.displayTexture = this.computer.getDisplayTexture();
    }

    public async init(): Promise<void> {
        this.displayTexture = this.computer.getDisplayTexture();
        this.buffers = await this.loadAssets();
        this.isInit = true;
    }
}