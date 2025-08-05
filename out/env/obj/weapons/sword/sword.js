var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat3, mat4, vec3 } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable } from "../../object-manager.js";
import { Loader } from "../../../../loader.js";
let Sword = class Sword {
    loader;
    modelMatrix;
    normalMatrix = mat3.create();
    model = null;
    texture = null;
    pos = {
        x: 5.0,
        y: 1.0,
        z: 5.0
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    constructor(loader) {
        this.loader = loader;
        this.modelMatrix = mat4.create();
    }
    async loadAssets() {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
            ]);
            if (!model || !texture)
                throw new Error('err');
            this.model = model;
            this.texture = texture;
            return true;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setSword() {
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
        if (!this.model || !this.texture) {
            console.warn('Sword not loaded');
            return undefined;
        }
        try {
            await this.setSword();
            const buffers = {
                vertex: this.model.vertex,
                color: this.model.color,
                index: this.model.index,
                indexCount: this.model.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: this.normalMatrix,
                texture: this.texture,
                sampler: this.loader.createSampler(),
                isLamp: [0.0, 0.0, 0.0]
            };
            return buffers;
        }
        catch (err) {
            console.error('Err sword', err);
            throw err;
        }
    }
    async update() {
    }
    async init() {
        try {
            await this.loadAssets();
            await this.setSword();
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
};
Sword = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Loader])
], Sword);
export { Sword };
