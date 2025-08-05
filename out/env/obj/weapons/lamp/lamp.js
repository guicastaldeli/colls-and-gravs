var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var _a, _b, _c;
import { mat3, mat4, vec3 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable } from "../object-manager.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { Wire } from "./wire.js";
import { LightningManager } from "../../../lightning-manager.js";
import { PointLight } from "../../../lightning/point-light.js";
import { parseColor } from "../../../render.js";
let Lamp = class Lamp {
    device;
    loader;
    buffers;
    shaderLoader;
    modelMatrix;
    wire;
    lightningManager;
    size = {
        w: 0.6,
        h: 0.6,
        d: 0.6
    };
    constructor(device, loader, shaderLoader, lightningManager) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.modelMatrix = mat4.create();
        this.wire = new Wire(loader);
        this.lightningManager = lightningManager;
    }
    getModelMatrix() {
        return this.modelMatrix;
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/lamp.obj'),
                this.loader.textureLoader('./assets/env/textures/lamp.png')
            ]);
            const lamp = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                normalMatrix: mat3.create(),
                texture: tex,
                sampler: this.loader.createSampler(),
                isLamp: [1.0, 1.0, 1.0]
            };
            return lamp;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async createLamp() {
        try {
            if (!this.buffers)
                return;
            const x = this.wire.pos.x;
            const y = this.wire.pos.y;
            const z = this.wire.pos.z;
            const position = vec3.fromValues(x, y, z);
            mat4.identity(this.buffers.modelMatrix);
            mat4.translate(this.buffers.modelMatrix, this.buffers.modelMatrix, position);
            mat4.scale(this.buffers.modelMatrix, this.buffers.modelMatrix, [
                this.size.w,
                this.size.h,
                this.size.d
            ]);
            mat4.copy(this.modelMatrix, this.buffers.modelMatrix);
            const normalMatrix = mat3.create();
            mat3.normalFromMat4(normalMatrix, this.buffers.modelMatrix);
            this.buffers.normalMatrix = normalMatrix;
            //Lightning
            const color = 'rgb(255, 255, 255)';
            const colorArray = parseColor(color);
            const lx = x;
            const ly = y;
            const lz = z;
            const light = new PointLight(vec3.fromValues(lx, ly, lz), colorArray, 0.8, 7.0);
            this.lightningManager.addPointLight('point', light);
            this.lightningManager.updatePointLightBuffer();
            //
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    update() { }
    async getBuffers() {
        const buffers = [];
        const wireBuffers = await this.wire.getBuffers();
        if (wireBuffers)
            buffers.push(...wireBuffers);
        if (this.buffers)
            buffers.push(this.buffers);
        return buffers;
    }
    async init() {
        await this.wire.init();
        this.buffers = await this.loadAssets();
        this.createLamp();
    }
};
Lamp = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, typeof (_a = typeof Loader !== "undefined" && Loader) === "function" ? _a : Object, typeof (_b = typeof ShaderLoader !== "undefined" && ShaderLoader) === "function" ? _b : Object, typeof (_c = typeof LightningManager !== "undefined" && LightningManager) === "function" ? _c : Object])
], Lamp);
export { Lamp };
