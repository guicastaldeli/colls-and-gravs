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
    position = vec3.create();
    isTargeted = false;
    _isEquipped = false;
    _renderVisible = true;
    _functional = true;
    isAnimating = false;
    weaponOffset = vec3.create();
    currentRotationX = 0;
    targetRotationX = 60;
    originalRotationX = 0;
    constructor(device, loader, shaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.modelMatrix = mat4.create();
        this.outline = new OutlineConfig(device, shaderLoader);
    }
    setDefaultWeaponPos() {
        vec3.set(this.weaponOffset, 0.5 - 0.9, 0.5);
    }
    setWeaponPos(offset, rotation) {
        vec3.copy(this.weaponOffset, offset);
        if (rotation)
            this.currentRotationX = rotation;
    }
    getWeaponPos() {
        return this.weaponOffset;
    }
    getWeaponRotation() {
        return this.currentRotationX;
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
    setRenderVisible(visible) {
        this._renderVisible = visible;
    }
    isRenderVisible() {
        return this._renderVisible;
    }
    setFunctional(functional) {
        this._functional = functional;
        if (!functional)
            this._functional = true;
    }
    isFunctional() {
        return this._functional;
    }
    disableTarget() {
        this.isTargeted = false;
    }
    setPosition(position) {
        vec3.copy(this.position, position);
        this.updateModelMatrix();
    }
    updateModelMatrix() {
        mat4.fromTranslation(this.modelMatrix, this.position);
        mat3.fromMat4(this.normalMatrix, this.modelMatrix);
        mat3.invert(this.normalMatrix, this.normalMatrix);
        mat3.transpose(this.normalMatrix, this.normalMatrix);
    }
    getPosition(out) {
        return out ? vec3.copy(out, this.position) : this.position;
    }
};
WeaponBase = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, Loader, ShaderLoader])
], WeaponBase);
export { WeaponBase };
