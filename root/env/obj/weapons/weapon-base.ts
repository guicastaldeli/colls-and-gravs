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
    public isTargeted: boolean = false;
    protected _isEquipped: boolean = false;
    protected _visible: boolean = true;
    
    constructor(device: GPUDevice, loader: Loader, shaderLoader: ShaderLoader) {
        this.device = device;
        this.loader = loader;
        this.shaderLoader = shaderLoader;

        this.outline = new OutlineConfig(device, shaderLoader);
        this.modelMatrix = mat4.create();
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

    public isVisible(): boolean {
        return this._visible;
    }

    public setVisible(visible: boolean): void {
        this._visible = visible;
    }

    public disableTarget(): void {
        this.isTargeted = false;
    }

    public abstract getBuffers(): Promise<EnvBufferData | undefined>;
    public abstract update(deltaTime: number): Promise<void>;
    public abstract updateTarget(playerController: PlayerController): Promise<void>;
}