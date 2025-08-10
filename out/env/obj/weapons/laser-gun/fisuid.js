import { vec3 } from "../../node_modules/gl-matrix/esm/index.js";
export class WeaponRenderer {
    device;
    objectManager;
    playerController;
    armController;
    ground;
    weapons = new Map();
    weaponDropConfig = new Map();
    projectiles;
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
        this.weaponDropConfig.set('sword', {
            groundOffset: 1.0,
            dropDistance: 3.0
        });
        this.weaponDropConfig.set('lasergun', {
            groundOffset: 0.6,
            dropDistance: 2.5
        });
        document.addEventListener('keydown', (e) => this.checkPickup(e));
        document.addEventListener('keydown', (e) => this.checkUnequip(e));
    }
    //Message
    showMessage(type) {
        const wType = type.toUpperCase();
        const content = `PRESS 'E' TO PICK ${wType}`;
        if (this.messageContainer) {
            const messageElement = this.messageContainer.querySelector('#weapon-message');
            if (messageElement)
                messageElement.textContent = content;
            this.messageContainer.style.display = 'block';
            return;
        }
        const message = `
                <div id="weapon-message-container">
                    <p id="weapon-message">${content}</p>
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
                    this.currentWeapon.setRenderVisible(true);
                    this.currentWeapon.setFunctional(true);
                    await this.armController.setWeapon(null);
                }
                weapon.disableTarget();
                weapon.equip();
                weapon.setRenderVisible(false);
                weapon.setFunctional(true);
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
        const weaponName = this.currentWeapon.getName();
        const config = this.weaponDropConfig.get(weaponName) || {
            groundOffset: 0.0,
            dropDistance: 1.0
        };
        const playerPos = this.playerController.getPosition();
        const playerForward = this.playerController.getForward();
        const dropPosition = vec3.create();
        vec3.scaleAndAdd(dropPosition, playerPos, playerForward, config.dropDistance);
        const groundLevel = this.ground.getGroundLevelY(dropPosition[0], dropPosition[2]);
        dropPosition[1] = groundLevel + config.groundOffset;
        this.currentWeapon.setPosition(dropPosition);
        this.currentWeapon.setRenderVisible(true);
        this.currentWeapon.setFunctional(true);
        this.currentWeapon.unequip();
        await this.armController.setWeapon(null);
        this.currentWeapon = null;
    }
    async addWeapon(name, weapon) {
        this.weapons.set(name, weapon);
    }
    async get() {
        const renderers = [];
        for (const [_, weapon] of this.weapons) {
            if (weapon.isRenderVisible()) {
                const buffers = await weapon.getBuffers();
                if (buffers) {
                    if (Array.isArray(buffers)) {
                        renderers.push(...buffers);
                    }
                    else {
                        renderers.push(buffers);
                    }
                }
            }
        }
        return renderers;
    }
    getWeapons() {
        return this.weapons;
    }
    async update(deltaTime, canvas, format) {
        this.hasTarget = false;
        for (const [_, weapon] of this.weapons) {
            if (weapon.isFunctional())
                await weapon.update(deltaTime);
        }
        for (const [_, weapon] of this.weapons) {
            if (weapon.isFunctional())
                await weapon.update(deltaTime);
            if (!weapon.isEquipped()) {
                await weapon.updateTarget(this.playerController);
                if (weapon.isTargeted) {
                    await weapon.initOutline(canvas, format);
                    this.hasTarget = true;
                    const name = weapon.getName();
                    if (!this.pickedWeapons.has(name))
                        this.showMessage(name);
                }
            }
        }
        if (!this.hasTarget)
            this.hideMessage();
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
        await this.addWeapon(sword.getName(), sword);
        //Laser Gun
        const laserGun = await this.objectManager.createWeapon('lasergun');
        await this.addWeapon(laserGun.getName(), laserGun);
    }
}
