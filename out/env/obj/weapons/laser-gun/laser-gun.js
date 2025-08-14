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
import { WeaponRenderer } from "../../../weapon-renderer.js";
import { Loader } from "../../../../loader.js";
import { ShaderLoader } from "../../../../shader-loader.js";
import { Raycaster } from "../../raycaster.js";
import { OutlineConfig } from "../../outline-config.js";
import { PlayerController } from "../../../../player/player-controller.js";
import { LaserProjectile } from "./laser-projectile.js";
let LaserGun = class LaserGun extends WeaponBase {
    device;
    loader;
    weaponRenderer;
    shaderLoader;
    playerController;
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
    //Laser
    isFiring = false;
    lastFireTime = 0;
    fireRate = 200;
    activeLasers = [];
    //Props
    pos = {
        x: 8.0,
        y: 0.6,
        z: 5.0
    };
    size = {
        w: 1.0,
        h: 1.0,
        d: 1.0
    };
    cameraPos = {
        x: 0.55,
        y: -0.8,
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
    constructor(device, loader, weaponRenderer, shaderLoader, playerController) {
        super(device, loader, shaderLoader);
        this.device = device;
        this.loader = loader;
        this.weaponRenderer = weaponRenderer;
        this.shaderLoader = shaderLoader;
        this.playerController = playerController;
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
                this.loader.parser('./.assets/env/obj/laser-gun.obj'),
                this.loader.textureLoader('./.assets/env/textures/laser-gun.png')
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
        const buffers = [];
        try {
            await this.setLaserGun();
            buffers.push({
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
            });
            return buffers;
        }
        catch (err) {
            console.error('Err laser gun', err);
            throw err;
        }
    }
    //Animation
    async updateAnimation(deltaTime) {
        this.fireLaser();
    }
    //Laser
    fireLaser() {
        const currentTime = Date.now();
        if (currentTime - this.lastFireTime < this.fireRate)
            return;
        this.lastFireTime = currentTime;
        this.isFiring = true;
        const cameraPos = this.playerController.getCameraPosition();
        const forward = vec3.clone(this.playerController.getForward());
        const right = vec3.clone(this.playerController.getRight());
        const up = vec3.clone(this.playerController.getUp());
        const startPos = vec3.create();
        vec3.copy(startPos, cameraPos);
        const rightOffset = 0.6;
        const downOffset = -0.8;
        const forwardOffset = 1.0;
        vec3.scaleAndAdd(startPos, startPos, right, rightOffset);
        vec3.scaleAndAdd(startPos, startPos, up, downOffset);
        vec3.scaleAndAdd(startPos, startPos, forward, forwardOffset);
        const laser = new LaserProjectile(this.device, this.loader, this.shaderLoader, startPos, forward);
        this.weaponRenderer.addProjectile(laser);
    }
    //
    async update(deltaTime) {
        for (let i = this.activeLasers.length - 1; i >= 0; i--) {
            const laser = this.activeLasers[i];
            await laser.update(deltaTime);
            if (laser.isExpired())
                this.activeLasers.splice(i, 1);
        }
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
    getName() { return 'lasergun'; }
};
LaserGun = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GPUDevice,
        Loader,
        WeaponRenderer,
        ShaderLoader,
        PlayerController])
], LaserGun);
export { LaserGun };
