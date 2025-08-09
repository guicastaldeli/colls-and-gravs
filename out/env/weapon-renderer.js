import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class WeaponRenderer {
    device;
    objectManager;
    playerController;
    armController;
    ground;
    weapons = new Map();
    pickedWeapons = new Set();
    currentWeapon = null;
    messageContainer;
    hasTarget = false;
    constructor(device, objectManager, playerController, armController, ground) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
        this.armController = armController;
        this.ground = ground;
        document.addEventListener('keydown', (e) => this.checkPickup(e));
        document.addEventListener('keydown', (e) => this.checkUnequip(e));
    }
    //Message
    showMessage(type) {
        const wType = type.toUpperCase();
        if (this.messageContainer) {
            this.messageContainer.style.display = 'block';
            return;
        }
        const message = `
                <div id="weapon-message-container">
                    <p id="weapon-message">PRESS 'E' TO PICK ${wType}</p>
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
                this.pickedWeapons.add(name);
                this.hideMessage();
                break;
            }
        }
    }
    async handleUnequip() {
        if (!this.currentWeapon)
            return;
        const playerPos = this.playerController.getPosition();
        const playerForward = this.playerController.getForward();
        const dropDistance = 3.0;
        const dropPosition = vec3.create();
        vec3.scaleAndAdd(dropPosition, playerPos, playerForward, dropDistance);
        const groundLevel = this.ground.getGroundLevelY(dropPosition[0], dropPosition[2]);
        dropPosition[1] = groundLevel + 1.0;
        this.currentWeapon.setPosition(dropPosition);
        this.currentWeapon.setVisible(true);
        this.currentWeapon.unequip();
        await this.armController.setWeapon(null);
        this.currentWeapon = null;
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
                this.hasTarget = true;
                if (!this.pickedWeapons.has(name))
                    this.showMessage(name);
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
    async checkUnequip(input) {
        const eKey = input.key.toLowerCase();
        if (eKey === 'q')
            await this.handleUnequip();
    }
    hasEquipped() {
        return this.currentWeapon !== null;
    }
    getCurrentWeapon() {
        return this.currentWeapon;
    }
    async getCurrentWeaponAnimation(deltaTime) {
        if (!this.currentWeapon)
            return;
        await this.currentWeapon.updateAnimation(deltaTime);
    }
    async render() {
        //Sword
        const sword = await this.objectManager.createWeapon('sword');
        await this.addWeapon('sword', sword);
        //Laser Gun
        const laserGun = await this.objectManager.createWeapon('lasergun');
        await this.addWeapon('lasergun', laserGun);
    }
}
