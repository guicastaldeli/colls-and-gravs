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
    private model: any;
    private texture!: GPUTexture;
    private modelMatrix: mat4;

    private isInit: boolean = false;
    private initPromise: Promise<void>;

    private pos = {
        x: 5.0,
        y: 2.0,
        z: 5.0
    }

    private size = {
        w: 1.5,
        h: 1.5,
        d: 1.5
    }

    constructor(device: GPUDevice, loader: Loader) {
        this.computer = new Computer(device);
        this.asmLoader = new AsmLoader();
        this.loader = loader;
        this.modelMatrix = mat4.create();
        this.displayTexture = this.computer.getDisplayTexture();
        this.initPromise = this.mainInit();
    }

    private async mainInit(): Promise<void> {
        try {
            await this.loadAssets();
            await this.setComputer();
            this.isInit = true;
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async loadAssets(): Promise<void> {
        try {
            const [model] = await Promise.all([
                this.loader.parser('./.assets/env/obj/earth.obj'),
                this.loadProgram()
            ]);

            if(!model) throw new Error('err');
            this.model = model;
        } catch(err) {
            console.log(err);
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

    public async getBuffers(): Promise<EnvBufferData> {
        if(!this.isInit) await this.initPromise;
        if(!this.model) throw new Error('computer model not loaded!');

        try {
            await this.setComputer();

            return {
                vertex: this.model.vertex,
                color: this.model.color,
                index: this.model.index,
                indexCount: this.model.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: this.model.normalMatrix,
                texture: this.displayTexture,
                sampler: this.loader.createSampler(),
                isLamp: [0.0, 0.0, 0.0],
                isEmissive: [0.0, 0.0, 0.0]
            }
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
        return this.initPromise;
    }
}