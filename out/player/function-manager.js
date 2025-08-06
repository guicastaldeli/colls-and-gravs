export class FunctionManager {
    tick;
    objectManager;
    weaponRenderer;
    playerController;
    hud;
    blockInstances = [];
    isInit = false;
    blockClickHandler = null;
    weaponClickHandler = null;
    constructor(tick, objectManager, weaponRenderer, playerController, hud) {
        this.tick = tick;
        this.objectManager = objectManager;
        this.weaponRenderer = weaponRenderer;
        this.playerController = playerController;
        this.hud = hud;
    }
    /* Random Blocks */
    async setBlocks() {
        if (this.tick.isPaused)
            return;
        if (this.weaponRenderer.hasEquipped()) {
            if (this.blockClickHandler) {
                document.removeEventListener('click', this.blockClickHandler);
                this.blockClickHandler = null;
            }
            return;
        }
        this.blockInstances.forEach((b) => {
            if (b.eventListenersInitialized)
                return;
            b.eventListenersInitialized = true;
        });
        if (!this.blockClickHandler) {
            this.blockClickHandler = async (e) => {
                const eKey = e.button;
                for (const b of this.blockInstances) {
                    if (eKey === 0)
                        await b.addBlocksRaycaster(this.playerController, this.hud);
                    if (eKey === 2)
                        b.removeBlockRaycaster(this.playerController);
                }
            };
            document.addEventListener('click', this.blockClickHandler);
        }
    }
    /* Weapons */
    async setWeaponsInteractions() {
        if (this.tick.isPaused)
            return;
        if (!this.weaponRenderer.hasEquipped()) {
            if (this.weaponClickHandler) {
                document.removeEventListener('click', this.weaponClickHandler);
                this.weaponClickHandler = null;
            }
            return;
        }
        if (!this.weaponClickHandler) {
            this.weaponClickHandler = async (e) => {
                const eKey = e.button;
                const currentWeapon = this.weaponRenderer.getCurrentWeapon();
                if (!currentWeapon)
                    return;
                if (eKey === 0)
                    console.log('tst');
            };
            document.addEventListener('click', this.weaponClickHandler);
        }
    }
    async init() {
        if (this.isInit)
            return;
        this.blockInstances = this.objectManager.getAllOfType('randomBlocks');
        this.setBlocks();
        this.setWeaponsInteractions();
        this.isInit = true;
    }
}
