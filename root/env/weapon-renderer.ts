import { EnvBufferData } from "./env-buffers.js";
import { ObjectManager } from "./obj/object-manager.js";
import { PlayerController } from "../player/player-controller.js";
import { WeaponBase } from "./obj/weapons/weapon-base.js";

export class WeaponRenderer {
    private device: GPUDevice;
    private objectManager: ObjectManager;
    private playerController: PlayerController;
    private weapons: Map<string, WeaponBase> = new Map();

    private messageContainer!: HTMLDivElement;
    private hasTarget: Boolean = false;

    constructor(device: GPUDevice, objectManager: ObjectManager, playerController: PlayerController) {
        this.device = device;
        this.objectManager = objectManager;
        this.playerController = playerController;
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

    public async addWeapon(name: string, weapon: WeaponBase): Promise<void> {
        this.weapons.set(name, weapon);
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        for(const [name, weapon] of this.weapons) {
            const buffers = await weapon.getBuffers();
            if(buffers) renderers.push(buffers);
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

    public async render(): Promise<void> {
        const sword = await this.objectManager.createWeapon<WeaponBase>('sword');
        await this.addWeapon('sword', sword);
    }
}