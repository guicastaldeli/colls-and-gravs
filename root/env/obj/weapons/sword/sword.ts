import { mat3, mat4, vec3, quat } from "../../../../../node_modules/gl-matrix/esm/index.js";
import { Injectable, ObjectManager } from "../../object-manager.js";
import { WeaponBase } from "../weapon-base.js";
import { EnvBufferData } from "../../../env-buffers.js";
import { Loader } from "../../../../loader.js";
import { ShaderLoader } from "../../../../shader-loader.js";
import { Raycaster } from "../../raycaster.js";
import { OutlineConfig } from "../../outline-config.js";
import { PlayerController } from "../../../../player/player-controller.js";

@Injectable()
export class Sword extends WeaponBase {
    protected device: GPUDevice;
    protected loader: Loader;
    protected shaderLoader: ShaderLoader;

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

    //Animation
    private animationDuration: number = 200;

    //Props
        private pos = {
            x: 5.0,
            y: 1.0,
            z: 5.0
        }

        private size = {
            w: 1.0,
            h: 1.0,
            d: 1.0
        }

        public cameraPos = {
            x: 0.65,
            y: -0.3,
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

    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
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
        this.setWeaponPos(
            vec3.fromValues(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z),
            this.currentRotationX
        );
    }

    private async loadAssets(): Promise<boolean> {
        try {
            const [model, texture] = await Promise.all([
                this.loader.parser('./assets/env/obj/sword.obj'),
                this.loader.textureLoader('./assets/env/textures/sword.png')
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

    private async setSword(): Promise<void> {
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

    public async getBuffers(): Promise<EnvBufferData | undefined> {
        if(!this.isLoaded) await this.loadingPromise;
        if(!this.model || !this.texture) {
            console.warn('Sword not loaded');
            return undefined;
        }

        try {
            await this.setSword();

            const buffers: EnvBufferData = {
                vertex: this.model.vertex,
                color: this.model.color,
                index: this.model.index,
                indexCount: this.model.indexCount,
                modelMatrix: this.modelMatrix,
                normalMatrix: this.normalMatrix,
                texture: this.texture,
                sampler: this.loader.createSampler(),
                isLamp: [0.0, 0.0, 0.0]
            }

            return buffers;
        } catch(err) {
            console.error('Err sword', err);
            throw err;
        }
    }

    //Animation
        private startAnimation(): void {
            if(!this.isAnimating) {
                this.isAnimating = true;
                this.originalRotationX = this.currentRotationX;
            }
        }

        public async updateAnimation(deltaTime: number): Promise<void> {
            this.startAnimation();
            this.currentRotationX = -this.targetRotationX;
            setTimeout(() => {
                this.currentRotationX = this.originalRotationX;
                this.setWeaponPos(
                    vec3.fromValues(this.cameraPos.x, this.cameraPos.y, this.cameraPos.z),
                    this.currentRotationX
                );
                this.isAnimating = false;
            }, this.animationDuration);
        }
    //

    //Name
    public getName(): string { 
        return 'sword'; 
    }

    public async update(deltaTime: number): Promise<void> {
        if(this.isAnimating) await this.updateAnimation(deltaTime);
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