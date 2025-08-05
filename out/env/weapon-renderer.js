export class WeaponRenderer {
    device;
    objectManager;
    constructor(device, objectManager) {
        this.device = device;
        this.objectManager = objectManager;
    }
    async get() {
        const renderers = [];
        if (this.objectManager) {
            const swordBuffers = await this.objectManager.setObjectBuffer('sword');
            if (swordBuffers)
                renderers.push(...swordBuffers);
        }
        return renderers;
    }
    async render(deltaTime) {
        if (this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}
