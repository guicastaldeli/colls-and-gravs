import { WeaponBase } from "./weapon-base.js";
export class TempWeaponBase extends WeaponBase {
    async update(deltaTime) { }
    ;
    async updateAnimation(deltaTime) { }
    ;
    async getBuffers() { return undefined; }
    ;
    async updateTarget(playerController) { }
}
