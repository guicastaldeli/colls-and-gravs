import { EnvBufferData } from "./env-buffers.js";
import { ObjectManager } from "./obj/object-manager.js";

export class WeaponRenderer {
    private device: GPUDevice;
    public objectManager: ObjectManager;

    constructor(device: GPUDevice, objectManager: ObjectManager) {
        this.device = device;
        this.objectManager = objectManager;
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        if(this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if(swordBuffers) renderers.push(...swordBuffers);
        }

        return renderers;
    }

    public async render(deltaTime: number): Promise<void> {
        if(this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}