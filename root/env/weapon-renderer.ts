import { EnvBufferData } from "./env-buffers.js";
import { ObjectManager } from "./obj/object-manager.js";
import { PlayerController } from "../player/player-controller.js";

export class WeaponRenderer {
    private device: GPUDevice;
    private objectManager: ObjectManager;
    private playerController: PlayerController;

    constructor(device: GPUDevice, objectManager: ObjectManager, playerController: PlayerController) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        if(this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if(swordBuffers) renderers.push(...swordBuffers);
        }

        return renderers;
    }

    public async update(deltaTime: number): Promise<void> {
        const swordUpdate = this.objectManager.getObject('sword');
        (await swordUpdate).update(deltaTime, this.playerController);
    }

    public async render(): Promise<void> {
        if(this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}