import { mat3, mat4, vec3, quat } from "../../node_modules/gl-matrix/esm/index.js";
import { EnvBufferData } from "./env-buffers.js";
import { ObjectManager } from "./obj/object-manager.js";
import { PlayerController } from "../player/player-controller.js";
import { WeaponBase } from "./obj/weapons/weapon-base.js";
import { ArmController } from "../player/arm-controller.js";
import { Ground } from "./ground.js";

interface WeaponDropConfig {
    groundOffset: number;
    dropDistance: number;
}

export class WeaponRenderer {
    private device: GPUDevice;
    private objectManager: ObjectManager;
    private playerController: PlayerController;
    private armController: ArmController;
    private ground: Ground;

    private weapons: Map<string, WeaponBase> = new Map();
    private weaponDropConfig: Map<string, WeaponDropConfig> = new Map();
    private pickedWeapons: Set<string> = new Set();
    private currentWeapon: WeaponBase | null = null;

    private messageContainer!: HTMLDivElement;
    private hasTarget: Boolean = false;

    constructor(
        device: GPUDevice, 
        objectManager: ObjectManager, 
        playerController: PlayerController,
        armController: ArmController,
        ground: Ground
    ) {
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
        private showMessage(type: string): void {
            const wType = type.toUpperCase();
            const content = `PRESS 'E' TO PICK ${wType}`;
            
            if(this.messageContainer) {
                const messageElement = this.messageContainer.querySelector('#weapon-message');
                if(messageElement) messageElement.textContent = content;
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
                this.pickedWeapons.add(name);
                this.hideMessage();
                break;
            }
        }
    }

    public async handleUnequip(): Promise<void> {
        if(!this.currentWeapon) return;

        const weaponName = this.currentWeapon.getName();
        const config = this.weaponDropConfig.get(weaponName) || {
            groundOffset: 0.0,
            dropDistance: 1.0
        }

        const playerPos = this.playerController.getPosition();
        const playerForward = this.playerController.getForward();

        const dropPosition = vec3.create();
        vec3.scaleAndAdd(dropPosition, playerPos, playerForward, config.dropDistance);

        const groundLevel = this.ground.getGroundLevelY(dropPosition[0], dropPosition[2]);
        dropPosition[1] = groundLevel + config.groundOffset;

        this.currentWeapon.setPosition(dropPosition);
        this.currentWeapon.setVisible(true);
        this.currentWeapon.unequip();

        await this.armController.setWeapon(null);
        this.currentWeapon = null;
    }

    public async addWeapon(name: string, weapon: WeaponBase): Promise<void> {
        this.weapons.set(name, weapon);
    }

    public async get(): Promise<EnvBufferData[]> {
        const renderers: EnvBufferData[] = [];
        
        for(const [name, weapon] of this.weapons) {
            if(weapon.isVisible()) {
                const buffers = await weapon.getBuffers();
                if(buffers) {
                    if(Array.isArray(buffers)) {
                        renderers.push(...buffers);
                    } else {
                        renderers.push(buffers);
                    }
                }
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
        
        for(const [_, weapon] of this.weapons) {
            if(weapon.isEquipped()) continue;
            await weapon.update(deltaTime);
            await weapon.updateTarget(this.playerController);

            if(weapon.isTargeted) {
                await weapon.initOutline(canvas, format);
                this.hasTarget = true;
                const name = weapon.getName();
                if(!this.pickedWeapons.has(name)) this.showMessage(name);
            }

            if(!this.hasTarget) this.hideMessage();
        }
    }

    public async checkPickup(input: KeyboardEvent): Promise<void> {
        const eKey = input.key.toLowerCase();
        if(eKey === 'e') await this.handlePickup();
    }

    public async checkUnequip(input: KeyboardEvent): Promise<void> {
        const eKey = input.key.toLowerCase();
        if(eKey === 'q') await this.handleUnequip();
    }

    public hasEquipped(): boolean {
        return this.currentWeapon !== null;
    }

    public getCurrentWeapon(): WeaponBase | null {
        return this.currentWeapon;
    }

    public async getCurrentWeaponAnimation(deltaTime: number): Promise<void> {
        if(!this.currentWeapon) return;
        await this.currentWeapon.updateAnimation(deltaTime);
    }

    public async render(): Promise<void> {
        //Sword
        const sword = await this.objectManager.createWeapon<WeaponBase>('sword');
        await this.addWeapon(sword.getName(), sword);

        //Laser Gun
        const laserGun = await this.objectManager.createWeapon<WeaponBase>('lasergun');
        await this.addWeapon(laserGun.getName(), laserGun);
    }
}