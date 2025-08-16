var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable } from "../../object-manager.js";
import { WeaponBase } from "../weapon-base.js";
import { Loader } from "../../../../loader.js";
import { ShaderLoader } from "../../../../shader-loader.js";
import { Raycaster } from "../../raycaster.js";
import { OutlineConfig } from "../../outline-config.js";
let Sword = class Sword extends WeaponBase {
    device;
    loader;
    shaderLoader;
    isLoaded = false;
    loadingPromise;
    modelMatrix;
    normalMatrix = mat3.create();
    model;
    texture;
    //Raycaster
    raycaster;
    outline;
    isTargeted = false;
    //Animation
    animationDuration = 200;
    //Props
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
    cameraPos = {
        x: 0.45,
        y: -0.8,
        z: 0.5
    };
    rotation = {
        upd: {
            x: -6,
            y: 0,
            z: 0
        },
        og: {
            x: 0,
            y: 0,
            z: 0
        }
    };
    //
    constructor(device, loader, shaderLoader) {
        super(device, loader, shaderLoader);
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.modelMatrix = mat4.create();
        this.raycaster = new Raycaster();
        this.outline = new OutlineConfig(device, shaderLoader);
        this.loadingPromise = this.loadAssets().then(() => this.setSword());
        const initialPos = vec3.fromValues(this.pos.x, this.pos.y, this.pos.z);
        this.setPosition(initialPos);
        this.originalRotationX = this.rotation.og.x;
        this.currentRotationX = this.originalRotationX;
        this.targetRotationX = this.rotation.upd.x;
        this.setWeaponPos(vec3.fromValues(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z), this.currentRotationX);
    }
    async loadAssets() {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./.assets/env/obj/sword.obj'),
                this.loader.textureLoader('./.assets/env/textures/sword.png')
            ]);
            if (!model || !texture)
                throw new Error('err');
            this.model = model;
            this.texture = texture;
            this.isLoaded = true;
            return true;
        }
        catch (err) {
            console.log(err);
            this.isLoaded = false;
            throw err;
        }
    }
    async setSword() {
        try {
            const scale = vec3.fromValues(this.size.w, this.size.h, this.size.d);
            mat4.identity(this.modelMatrix);
            mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
            mat4.scale(this.modelMatrix, this.modelMatrix, scale);
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    }
    async updateTarget(playerController) {
        if (!this.isLoaded)
            await this.loadingPromise;
        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const orientation = quat.create();
        const halfSize = vec3.scale(vec3.create(), [
            this.size.w,
            this.size.h,
            this.size.d
        ], 0.5);
        const intersection = this.raycaster.getRayOBBIntersect(rayOrigin, rayDirection, this.position, halfSize, orientation);
        this.isTargeted =
            intersection.hit &&
                intersection.distance !== undefined &&
                intersection.distance < maxDistance;
    }
    async renderOutline(canvas, device, format) {
        this.outline.initOutline(canvas, device, format);
    }
    async getBuffers() {
        if (!this.isLoaded)
            await this.loadingPromise;
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
                isLamp: [0.0, 0.0, 0.0],
                isEmissive: [0.0, 0.0, 0.0]
            };
            return buffers;
        }
        catch (err) {
            console.error('Err sword', err);
            throw err;
        }
    }
    //Animation
    startAnimation() {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.originalRotationX = this.currentRotationX;
        }
    }
    async updateAnimation(deltaTime) {
        this.startAnimation();
        this.currentRotationX = -this.targetRotationX;
        setTimeout(() => {
            this.currentRotationX = this.originalRotationX;
            this.setWeaponPos(vec3.fromValues(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z), this.currentRotationX);
            this.isAnimating = false;
        }, this.animationDuration);
    }
    //
    //Name
    getName() {
        return 'sword';
    }
    async update(deltaTime) {
        if (this.isAnimating)
            await this.updateAnimation(deltaTime);
    }
    async init(canvas, format, playerController) {
        try {
            await this.loadingPromise;
            await this.renderOutline(canvas, this.device, format);
            await this.updateTarget(playerController);
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
};
Sword = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, Loader, ShaderLoader])
], Sword);
export { Sword };
