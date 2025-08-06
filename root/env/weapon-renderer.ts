import { EnvBufferData } from "./env-buffers.js";
import { ObjectManager } from "./obj/object-manager.js";
import { PlayerController } from "../player/player-controller.js";
import { WeaponBase } from "./obj/weapons/weapon-base.js";
import { ArmController } from "../player/arm-controller.js";

export class WeaponRenderer {
    private device: GPUDevice;
    private objectManager: ObjectManager;
    private playerController: PlayerController;
    private weapons: Map<string, WeaponBase> = new Map();
    private currentWeapon: WeaponBase | null = null;
    private armController: ArmController;

    private messageContainer!: HTMLDivElement;
    private hasTarget: Boolean = false;

    constructor(
        device: GPUDevice, 
        objectManager: ObjectManager, 
        playerController: PlayerController,
        armController: ArmController
    ) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
        this.armController = armController;
        document.addEventListener('keydown', (e) => this.checkPickup(e));
    }

    //Message
        private showMessage(type: string): void {
            if(this.messageContainer) {
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
            if(!messageContainer) throw new Error('Message err');

            const messageElement = messageContainer.cloneNode(true) as HTMLDivElement;
            document.body.appendChild(messageElement);
            this.messageContainer = messageElement;
        }

        private hideMessage(): void {
            if(!this.messageContainer) return;
            this.messageContainer.style.display = 'none';
        }
    //

    public async handlePickup(): Promise<void> {
        if(!this.hasTarget) return;

        for(const [name, weapon] of this.weapons) {
            if(weapon.isTargeted) {
                if(this.currentWeapon) {
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

    public async addWeapon(name: string, weapon: WeaponBase): Promise<void> {
        this.weapons.set(name, weapon);
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        for(const [name, weapon] of this.weapons) {
            if(weapon.isVisible()) {
                const buffers = await weapon.getBuffers();
                if(buffers) renderers.push(buffers);
            }
        }

        return renderers;
    }

    public getWeapons(): Map<string, WeaponBase> {
        return this.weapons;
    }

    public async update(
        deltaTime: number, 
        canvas: HTMLCanvasElement,
        format: GPUTextureFormat
    ): Promise<void> {
        this.hasTarget = false;
        
        for(const [name, weapon] of this.weapons) {
            if(weapon.isEquipped()) continue;
            await weapon.update(deltaTime);
            await weapon.updateTarget(this.playerController);

            if(weapon.isTargeted) {
                await weapon.initOutline(canvas, format);
                this.showMessage(name);
                this.hasTarget = true;
            }

            if(!this.hasTarget) this.hideMessage();
        }
    }

    public async checkPickup(input: KeyboardEvent): Promise<void> {
        const eKey = input.key.toLowerCase();
        if(eKey === 'e') await this.handlePickup();
    }

    public async render(): Promise<void> {
        const sword = await this.objectManager.createWeapon<WeaponBase>('sword');
        await this.addWeapon('sword', sword);
    }
}