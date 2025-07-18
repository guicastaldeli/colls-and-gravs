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
import { Injectable } from "../object-manager.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Loader } from "../../../loader.js";
import { WindManager } from "../../../wind-manager.js";
import { Wire } from "./wire.js";
import { LightningManager } from "../../../lightning-manager.js";
import { PointLight } from "../../../lightning/point-light.js";
import { parseColor } from "../../../render.js";
let Lamp = class Lamp {
    device;
    passEncoder;
    loader;
    buffers;
    shaderLoader;
    modelMatrix;
    emissiveStrength = 2.5;
    windManager;
    wire;
    lightningManager;
    pipeline;
    uniformBuffer;
    bindGroup;
    size = {
        w: 0.2,
        h: 0.2,
        d: 0.2
    };
    constructor(device, passEncoder, loader, shaderLoader, windManager, lightningManager) {
        this.device = device;
        this.passEncoder = passEncoder;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.modelMatrix = mat4.create();
        this.windManager = windManager;
        this.wire = new Wire(windManager, loader);
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
                sampler: this.loader.createSampler()
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
            //Lightning
            const color = 'rgb(255, 255, 255)';
            const colorArray = parseColor(color);
            const lx = x;
            const ly = y;
            const lz = z;
            const light = new PointLight(vec3.fromValues(lx, ly, lz), colorArray, 0.8, 8.0);
            this.lightningManager.addPointLight('point', light);
            this.lightningManager.updatePointLightBuffer();
            const uniformData = new Float32Array(20);
            const mvpMatrix = mat4.create();
            uniformData.set(mvpMatrix, 0);
            uniformData[16] = this.emissiveStrength;
            uniformData.set([0, 0, 0], 17);
            const uniformBuffer = this.device.createBuffer({
                size: uniformData.byteLength,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            new Float32Array(uniformBuffer.getMappedRange()).set(uniformData);
            uniformBuffer.unmap();
            //
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async initShaders() {
        try {
            const [vertexShader, fragShader] = await Promise.all([
                this.shaderLoader.loader('./env/obj/lamp/shaders/vertex.wgsl'),
                this.shaderLoader.loader('./env/obj/lamp/shaders/frag.wgsl'),
            ]);
            return {
                vertexShader,
                fragShader
            };
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async getBuffers() {
        const buffers = [];
        if (this.buffers)
            buffers.push(this.buffers);
        const wireBuffers = await this.wire.getBuffers();
        if (wireBuffers)
            buffers.push(...wireBuffers);
        return buffers;
    }
    async update(deltaTime, passEncoder, viewProjectionMatrix) {
        if (!passEncoder || !viewProjectionMatrix)
            throw new Error('err');
        await this.wire.update(this.device, deltaTime);
    }
    async init() {
        await this.initShaders();
        this.buffers = await this.loadAssets();
        this.createLamp();
        await this.wire.init();
    }
};
Lamp = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice,
        GPURenderPassEncoder,
        Loader,
        ShaderLoader,
        WindManager,
        LightningManager])
], Lamp);
export { Lamp };
