var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat3, mat4 } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Loader } from "../../../loader.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { Injectable } from "../object-manager.js";
import { OutlineConfig } from "../outline-config.js";
let WeaponBase = class WeaponBase {
    device;
    loader;
    shaderLoader;
    outline;
    modelMatrix;
    normalMatrix = mat3.create();
    isTargeted = false;
    _isEquipped = false;
    constructor(device, loader, shaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.outline = new OutlineConfig(device, shaderLoader);
        this.modelMatrix = mat4.create();
    }
    async initOutline(canvas, format) {
        await this.outline.initOutline(canvas, this.device, format);
    }
    getOutlineConfig() {
        return this.outline;
    }
    equip() {
        this._isEquipped = true;
    }
    unequip() {
        this._isEquipped = false;
    }
    isEquipped() {
        return this._isEquipped;
    }
};
WeaponBase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, Loader, ShaderLoader])
], WeaponBase);
export { WeaponBase };
