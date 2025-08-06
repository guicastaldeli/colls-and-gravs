export class WeaponRenderer {
    device;
    objectManager;
    playerController;
    weapons = new Map();
    messageContainer;
    hasTarget = false;
    constructor(device, objectManager, playerController) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
    }
    //Message
    showMessage(type) {
        if (this.messageContainer) {
            this.messageContainer.style.display = 'block';
            return;
        }
        const message = `
                <div id="weapon-message-container">
                    <p id="weapon-message">PRESS 'E' TO PICK ${type}</p>
                </div>
            `;
        const parser = new DOMParser();
        const doc = parser.parseFromString(message, 'text/html');
        const messageContainer = doc.body.querySelector('#weapon-message-container');
        if (!messageContainer)
            throw new Error('Message err');
        const messageElement = messageContainer.cloneNode(true);
        document.body.appendChild(messageElement);
        this.messageContainer = messageElement;
    }
    hideMessage() {
        if (!this.messageContainer)
            return;
        this.messageContainer.style.display = 'none';
    }
    //
    async addWeapon(name, weapon) {
        this.weapons.set(name, weapon);
    }
    async get() {
        const renderers = [];
        for (const [name, weapon] of this.weapons) {
            const buffers = await weapon.getBuffers();
            if (buffers)
                renderers.push(buffers);
        }
        return renderers;
    }
    getWeapons() {
        return this.weapons;
    }
    async update(deltaTime, canvas, format) {
        this.hasTarget = false;
        for (const [name, weapon] of this.weapons) {
            await weapon.update(deltaTime);
            await weapon.updateTarget(this.playerController);
            if (weapon.isTargeted) {
                await weapon.initOutline(canvas, format);
                this.showMessage(name);
                this.hasTarget = true;
            }
            if (!this.hasTarget)
                this.hideMessage();
        }
    }
    async render() {
        const sword = await this.objectManager.createWeapon('sword');
        await this.addWeapon('sword', sword);
    }
}
