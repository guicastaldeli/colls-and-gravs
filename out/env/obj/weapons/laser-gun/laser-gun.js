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
let LaserGun = class LaserGun extends WeaponBase {
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
        x: 15.0,
        y: 1.0,
        z: 5.0
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    cameraPos = {
        x: 0.65,
        y: -0.3,
        z: 0.8
    };
    rotation = {
        upd: {
            x: 60,
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
        this.loadingPromise = this.loadAssets().then(() => this.setLaserGun());
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
                this.loader.parser('./assets/env/obj/laser-gun.obj'),
                this.loader.textureLoader('./assets/env/textures/laser-gun.png')
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
    async setLaserGun() {
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
            console.warn('Laser gun not loaded');
            return undefined;
        }
        try {
            await this.setLaserGun();
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
            console.error('Err laser gun', err);
            throw err;
        }
    }
    //Animation
    startAnimation() {
    }
    async updateAnimation(deltaTime) {
    }
    //
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
LaserGun = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice, Loader, ShaderLoader])
], LaserGun);
export { LaserGun };
