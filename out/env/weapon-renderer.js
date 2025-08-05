export class WeaponRenderer {
    device;
    objectManager;
    playerController;
    constructor(device, objectManager, playerController) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
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
    async update(deltaTime) {
        const swordUpdate = this.objectManager.getObject('sword');
        (await swordUpdate).update(deltaTime, this.playerController);
    }
    async render() {
        if (this.objectManager) {
            await this.objectManager.createObject('sword');
        }
    }
}
