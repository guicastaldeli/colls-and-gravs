export class WeaponRenderer {
    device;
    objectManager;
    playerController;
    weapons = new Map();
    currentWeapon = null;
    armController;
    messageContainer;
    hasTarget = false;
    constructor(device, objectManager, playerController, armController) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
        this.armController = armController;
        document.addEventListener('keydown', (e) => this.checkPickup(e));
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
    async handlePickup() {
        if (!this.hasTarget)
            return;
        for (const [name, weapon] of this.weapons) {
            if (weapon.isTargeted) {
                if (this.currentWeapon) {
                    this.currentWeapon.unequip();
                    this.currentWeapon.setVisible(true);
                    await this.armController.setWeapon(null);
                }
                weapon.disableTarget();
                weapon.equip();
                weapon.setVisible(false);
                this.currentWeapon = weapon;
                await this.armController.setWeapon(weapon);
                this.hideMessage();
                break;
            }
        }
    }
    async addWeapon(name, weapon) {
        this.weapons.set(name, weapon);
    }
    async get() {
        const renderers = [];
        for (const [name, weapon] of this.weapons) {
            if (weapon.isVisible()) {
                const buffers = await weapon.getBuffers();
                if (buffers)
                    renderers.push(buffers);
            }
        }
        return renderers;
    }
    getWeapons() {
        return this.weapons;
    }
    async update(deltaTime, canvas, format) {
        this.hasTarget = false;
        for (const [name, weapon] of this.weapons) {
            if (weapon.isEquipped())
                continue;
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
    async checkPickup(input) {
        const eKey = input.key.toLowerCase();
        if (eKey === 'e')
            await this.handlePickup();
    }
    async render() {
        const sword = await this.objectManager.createWeapon('sword');
        await this.addWeapon('sword', sword);
    }
}
