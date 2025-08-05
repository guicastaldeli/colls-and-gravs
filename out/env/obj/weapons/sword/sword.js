var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat4, vec3 } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable } from "../../object-manager.js";
import { Loader } from "../../../../loader.js";
let Sword = class Sword {
    loader;
    pos = {
        x: 7.0,
        y: 0.0,
        z: 7.5
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    constructor(loader) {
        this.loader = loader;
        console.log(this.loader);
    }
    async loadAssets() {
        try {
            const [model, tex] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
            ]);
            const sword = {
                vertex: model.vertex,
                color: model.color,
                index: model.index,
                indexCount: model.indexCount,
                modelMatrix: mat4.create(),
                texture: tex,
                sampler: this.loader.createSampler()
            };
            return sword;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async setSword() {
        try {
            const x = this.pos.x;
            const y = this.pos.y;
            const z = this.pos.z;
            const position = vec3.fromValues(x, y, z);
            return position;
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async update() {
    }
    async init() {
        await this.loadAssets();
        await this.setSword();
    }
};
Sword = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Loader])
], Sword);
export { Sword };
