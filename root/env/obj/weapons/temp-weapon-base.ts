import { PlayerController } from "../../../player/player-controller.js";
import { EnvBufferData } from "../../env-buffers.js";
import { WeaponBase } from "./weapon-base.js";

export class TempWeaponBase extends WeaponBase {
    public async update(deltaTime: number): Promise<void> {};
    public async updateAnimation(deltaTime: number): Promise<void> {};
    public async getBuffers(): Promise<EnvBufferData | undefined> { return undefined; };
    public async updateTarget(playerController: PlayerController): Promise<void> {}
}