import { mat3, mat4, vec3, quat } from "../../../../node_modules/gl-matrix/esm/index.js";
import { Loader } from "../../../loader.js";
import { PlayerController } from "../../../player/player-controller.js";
import { ShaderLoader } from "../../../shader-loader.js";
import { EnvBufferData } from "../../env-buffers.js";
import { Injectable } from "../object-manager.js";
import { OutlineConfig } from "../outline-config.js";

@Injectable()
export abstract class WeaponBase {
    protected device: GPUDevice;
    protected loader: Loader;
    protected shaderLoader: ShaderLoader;
    protected outline: OutlineConfig;
    protected modelMatrix: mat4;
    protected normalMatrix: mat3 = mat3.create();
    protected position: vec3 = vec3.create();
    public isTargeted: boolean = false;

    protected _isEquipped: boolean = false;
    protected _renderVisible: boolean = true;
    protected _functional: boolean = true;

    public isAnimating: boolean = false;
    protected weaponOffset: vec3 = vec3.create();
    protected currentRotationX: number = 0;
    protected targetRotationX: number = 60;
    protected originalRotationX: number = 0;
    
    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;
        this.modelMatrix = mat4.create();
        this.outline = new OutlineConfig(device, shaderLoader);
    }

    protected setDefaultWeaponPos(): void {
        vec3.set(this.weaponOffset, 0.5 -0.9, 0.5);
    }

    public setWeaponPos(offset: vec3, rotation?: number): void {
        vec3.copy(this.weaponOffset, offset);
        if(rotation) this.currentRotationX = rotation;
    }

    public getWeaponPos(): vec3 {
        return this.weaponOffset;
    }

    public getWeaponRotation(): number {
        return this.currentRotationX;
    }

    public async initOutline(canvas: HTMLCanvasElement, format: GPUTextureFormat): Promise<void> {
        await this.outline.initOutline(canvas, this.device, format);
    }

    public getOutlineConfig(): OutlineConfig {
        return this.outline;
    }

    public equip(): void {
        this._isEquipped = true;
    }

    public unequip(): void {
        this._isEquipped = false;
    }

    public isEquipped(): boolean {
        return this._isEquipped;
    }

    public setRenderVisible(visible: boolean): void {
        this._renderVisible = visible;
    }

    public isRenderVisible(): boolean {
        return this._renderVisible;
    }

    public setFunctional(functional: boolean): void {
        this._functional = functional;
        if(!functional) this._functional = true;
    }

    public isFunctional(): boolean {
        return this._functional;
    }

    public disableTarget(): void {
        this.isTargeted = false;
    }

    public setPosition(position: vec3): void {
        vec3.copy(this.position, position);
        this.updateModelMatrix();
    }

    public updateModelMatrix(): void {
        mat4.fromTranslation(this.modelMatrix, this.position);
        mat3.fromMat4(this.normalMatrix, this.modelMatrix);
        mat3.invert(this.normalMatrix, this.normalMatrix);
        mat3.transpose(this.normalMatrix, this.normalMatrix);
    }

    public getPosition(out?: vec3): vec3 {
        return out ? vec3.copy(out, this.position) : this.position;
    }

    public abstract getName(): string;
    public abstract update(deltaTime: number): Promise<void>;
    public abstract updateAnimation(deltaTime: number): Promise<void>;
    public abstract getBuffers(): Promise<EnvBufferData | EnvBufferData[] | undefined>;
    public abstract updateTarget(playerController: PlayerController): Promise<void>;
}