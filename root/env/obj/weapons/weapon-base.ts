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

    public abstract getBuffers(): Promise<EnvBufferData | undefined>;
    public abstract update(deltaTime: number): Promise<void>;
    public abstract updateTarget(playerController: PlayerController): Promise<void>;
}