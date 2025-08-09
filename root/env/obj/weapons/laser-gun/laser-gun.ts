import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../../object-manager.js";
import { WeaponBase } from "../weapon-base.js";
import { EnvBufferData } from "../../../env-buffers.js";
import { Loader } from "../../../../loader.js";
import { ShaderLoader } from "../../../../shader-loader.js";
import { Raycaster } from "../../raycaster.js";
import { OutlineConfig } from "../../outline-config.js";
import { PlayerController } from "../../../../player/player-controller.js";
import { LaserProjectile } from "./laser-projectile.js";

@Injectable()
export class LaserGun extends WeaponBase {
    protected device: GPUDevice;
    protected loader: Loader;
    protected shaderLoader: ShaderLoader;
    private playerController: PlayerController;

    private isLoaded: boolean = false;
    private loadingPromise: Promise<void>;

    protected modelMatrix: mat4;
    protected normalMatrix: mat3 = mat3.create();
    private model: any;
    private texture!: GPUTexture;

    //Raycaster
    private raycaster: Raycaster;
    protected outline: OutlineConfig;
    public isTargeted: boolean = false;

    //Laser
    private isFiring: boolean = false;
    private lastFireTime: number = 0;
    private fireRate: number = 200;
    private activeLasers: LaserProjectile[] = [];

    //Props
        private pos = {
            x: 8.0,
            y: 0.6,
            z: 5.0
        }

        private size = {
            w: 1.0,
            h: 1.0,
            d: 1.0
        }

        public cameraPos = {
            x: 0.65,
            y: -0.8,
            z: 0.8
        }

        public rotation = {
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
        }
    //

    constructor(
        device: GPUDevice, 
        loader: Loader, 
        shaderLoader: ShaderLoader,
        playerController: PlayerController
    ) {
        super(device, loader, shaderLoader);
        this.device = device;
        this.loader = loader;
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
        this.setWeaponPos(
            vec3.fromValues(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z),
            this.currentRotationX
        );
    }

    private async loadAssets(): Promise<boolean> {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./assets/env/obj/laser-gun.obj'),
                this.loader.textureLoader('./assets/env/textures/laser-gun.png')
            ]);

            if(!model || !texture) throw new Error('err');
            this.model = model;
            this.texture = texture;
            this.isLoaded = true;
            return true;
        } catch(err) {
            console.log(err);
            this.isLoaded = false;
            throw err;
        }
    }

    private async setLaserGun(): Promise<void> {
        try {
            const scale = vec3.fromValues(this.size.w, this.size.h, this.size.d);
            mat4.identity(this.modelMatrix);
            mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
            mat4.scale(this.modelMatrix, this.modelMatrix, scale);
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    public async updateTarget(playerController: PlayerController): Promise<void> {
        if(!this.isLoaded) await this.loadingPromise;

        const maxDistance = 5.0;
        const rayOrigin = playerController.getCameraPosition();
        const rayDirection = playerController.getForward();
        const orientation = quat.create();

        const halfSize = vec3.scale(vec3.create(), [
            this.size.w,
            this.size.h,
            this.size.d
        ], 0.5);

        const intersection = this.raycaster.getRayOBBIntersect(
            rayOrigin,
            rayDirection,
            this.position,
            halfSize,
            orientation
        );

        this.isTargeted = 
        intersection.hit &&
        intersection.distance !== undefined &&
        intersection.distance < maxDistance;
    }

    private async renderOutline(canvas: HTMLCanvasElement, device: GPUDevice, format: GPUTextureFormat): Promise<void> {
        this.outline.initOutline(canvas, device, format);
    }

    public async getBuffers(): Promise<EnvBufferData[]> {
        if(!this.isLoaded) await this.loadingPromise;
        const buffers: EnvBufferData[] = [];

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
                isLamp: [0.0, 0.0, 0.0]
            });
            for(const laser of this.activeLasers) {
                const laserBuffers = await laser.getBuffers();
                if(laserBuffers) {
                    if(Array.isArray(laserBuffers)) {
                        buffers.push(...laserBuffers);
                    } else {
                        buffers.push(laserBuffers);
                    }
                }
            }

            return buffers;
        } catch(err) {
            console.error('Err laser gun', err);
            throw err;
        }
    }

    //Animation
        public async updateAnimation(deltaTime: number): Promise<void> {
            this.fireLaser();
        }

        //Laser
        private fireLaser(): void {
            const currentTime = Date.now();
            if(currentTime - this.lastFireTime < this.fireRate) return;
            this.lastFireTime = currentTime;
            this.isFiring = true;

            const laser = new LaserProjectile(
                this.device,
                this.loader,
                this.shaderLoader,
                this.playerController.getCameraPosition(),
                this.playerController.getForward()
            );
            this.activeLasers.push(laser);
        }
    //

    //Name
    public getName(): string { 
        return 'lasergun'; 
    }

    public async update(deltaTime: number): Promise<void> {
        for(let i = this.activeLasers.length - 1; i >= 0; i--) {
            const laser = this.activeLasers[i];
            await laser.update(deltaTime);
            if(laser.isExpired()) this.activeLasers.splice(i, 1);
        }
    }

    public async init(canvas: HTMLCanvasElement, format: GPUTextureFormat, playerController: PlayerController): Promise<void> {
        try {
            await this.loadingPromise;
            await this.renderOutline(canvas, this.device, format);
            await this.updateTarget(playerController);
        } catch(err) {
            console.log(err);
            throw err;
        }
    }
}