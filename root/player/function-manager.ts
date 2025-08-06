import { Tick } from "../tick";
import { ObjectManager } from "../env/obj/object-manager";
import { WeaponRenderer } from "../env/weapon-renderer";
import { PlayerController } from "./player-controller";
import { Hud } from "../hud";

export class FunctionManager {
    private tick: Tick;
    private objectManager: ObjectManager;
    private weaponRenderer: WeaponRenderer;
    private playerController: PlayerController;
    private hud: Hud;
    private blockInstances: any[] = [];
    private isInit: boolean = false;

    private blockClickHandler: ((e: MouseEvent) => Promise<void>) | null = null;
    private weaponClickHandler: ((e: MouseEvent) => Promise<void>) | null = null;

    constructor(
        tick: Tick,
        objectManager: ObjectManager, 
        weaponRenderer: WeaponRenderer,
        playerController: PlayerController,
        hud: Hud
    ) {
        this.tick = tick;
        this.objectManager = objectManager;
        this.weaponRenderer = weaponRenderer;
        this.playerController = playerController;
        this.hud = hud;
    }

    /* Random Blocks */
    private async setBlocks(): Promise<void> {
        if(this.tick.isPaused) return;
        if(this.weaponRenderer.hasEquipped()) {
            if(this.blockClickHandler) {
                document.removeEventListener('click', this.blockClickHandler);
                this.blockClickHandler = null;
            }
            return;
        }

        this.blockInstances.forEach((b: any) => {
            if(b.eventListenersInitialized) return;
            b.eventListenersInitialized = true;
        });
        
        if(!this.blockClickHandler) {
            this.blockClickHandler = async (e: MouseEvent) => {
                if(this.weaponRenderer.hasEquipped()) return;
                const eKey = e.button;

                for(const b of this.blockInstances) {
                    if(eKey === 0) await b.addBlocksRaycaster(this.playerController, this.hud);
                    if(eKey === 2) b.removeBlockRaycaster(this.playerController);
                }
            }
            document.addEventListener('click', this.blockClickHandler);
        }
    }

    /* Weapons */
    private async setWeaponsInteractions(): Promise<void> {
        if(this.tick.isPaused) return;
        if(this.weaponRenderer.hasEquipped()) {
            if(this.weaponClickHandler) {
                document.removeEventListener('click', this.weaponClickHandler);
                this.weaponClickHandler = null;
            }
            return;
        }

        if(!this.weaponClickHandler) {
            this.weaponClickHandler = async (e: MouseEvent) => {
                const eKey = e.button;
                const currentWeapon = this.weaponRenderer.getCurrentWeapon();
                if(!currentWeapon) return;
                if(eKey === 0) console.log('tst')
            }
            document.addEventListener('click', this.weaponClickHandler);
        }
    }

    public async init(): Promise<void> {
        if(this.isInit) return;
        this.blockInstances = this.objectManager.getAllOfType('randomBlocks') as any[];
        this.setBlocks();
        this.setWeaponsInteractions();
        this.isInit = true;
    }
}