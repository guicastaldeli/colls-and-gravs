var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat3, mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { AsmLoader } from "../../../asm-loader.js";
import { Computer } from "../../../assembler/computer.js";
import { Loader } from "../../../loader.js";
import { Injectable } from "../object-manager.js";
let EnvComputer = class EnvComputer {
    computer;
    asmLoader;
    loader;
    displayTexture;
    buffers;
    modelMatrix;
    isInit = false;
    pos = {
        x: 5.0,
        y: 0.0,
        z: 5.0
    };
    size = {
        w: 1.5,
        h: 1.5,
        d: 1.0
    };
    constructor(device, loader) {
        this.computer = new Computer(device);
        this.asmLoader = new AsmLoader();
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }
    async loadAssets() {
        try {
            const [model] = await Promise.all([
                this.loader.parser('./.assets/env/obj/smile.obj'),
                this.loadProgram()
            ]);
            const lamp = {
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
            };
            return lamp;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async loadProgram() {
        try {
            const path = './assembler/program.asm';
            const code = await this.asmLoader.loader(path);
            this.computer.loadAssembly(code);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setComputer() {
        try {
            const position = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
            const scale = vec3.fromValues(this.size.w, this.size.h, this.size.d);
            mat4.identity(this.modelMatrix);
            mat4.translate(this.modelMatrix, this.modelMatrix, position);
            mat4.scale(this.modelMatrix, this.modelMatrix, scale);
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async getBuffers() {
        if (!this.isInit)
            throw new Error('not init yet!');
        try {
            await this.setComputer();
            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, this.buffers.modelMatrix);
            this.buffers.normalMatrix = normalMatrix;
            const buffers = {
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
            };
            return buffers;
        }
        catch (err) {
            console.error('Err computer', err);
            throw err;
        }
    }
    async update(cycles) {
        this.computer.run(cycles);
        this.displayTexture = this.computer.getDisplayTexture();
    }
    async init() {
        this.displayTexture = this.computer.getDisplayTexture();
        this.buffers = await this.loadAssets();
        this.isInit = true;
    }
};
EnvComputer = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, Loader])
], EnvComputer);
export { EnvComputer };
