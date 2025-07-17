import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { ListData } from "./env/obj/random-blocks/list.js";
import { PlayerController } from "./player/player-controller.js";

interface CommandConfig {
    commands: {
        [key: string]: {
            description: string;
            args: {
                name: string;
                type: string;
                required: boolean;
                description: string;
            }[]
            handler: string;
        }
    }
}

export class CommandManager {
    private playerController: PlayerController;
    private commandBar: HTMLInputElement | null = null;
    private commandConfig: CommandConfig | null = null;
    private spawnHandler: Map<string, (args: string[]) => Promise<void>> = new Map();

    constructor(playerController: PlayerController) {
        this.playerController = playerController;
        this.loadCommands();
        this.registerHandlers();
        this.showCommandBar();
    }

    private async loadCommands(): Promise<void> {
        try {
            const res = await fetch('./command-list.json');
            this.commandConfig = await res.json();
        } catch(err) {
            console.error('Failed to load commands', err);
            this.commandConfig = { commands: {} };
        }
    }

    private async registerHandlers(): Promise<void> {
        this.spawnHandler.set('handleSpawn', this.handleSpawn.bind(this));
        this.spawnHandler.set('handleClear', this.handleClear.bind(this));
        this.spawnHandler.set('handleList', this.handleList.bind(this));
    }

    private showCommandBar(): void {
        document.addEventListener('keydown', (e) => {
            const eKey = e.key.toLowerCase();

            if(eKey === 'y') {
                e.preventDefault();
                this.createCommandBar();
                this.commandBar?.focus();
            }
        })
    }
    
    private createCommandBar(): void {
        if(this.commandBar) return;

        const commandBar = `
            <div class="command-container">
                <input id="command-bar" type="text"></input>
            </div>
        `;

        const parser = new DOMParser();
        const doc = parser.parseFromString(commandBar, 'text/html');
        const commandContainer = doc.body.querySelector('#command-bar');
        if(!commandContainer) throw new Error('Command bar err');

        const commandBarElement = commandContainer.cloneNode(true) as HTMLInputElement;
        document.body.appendChild(commandContainer);
        this.commandBar = commandBarElement;

        //Empty
        this.commandBar.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') {
                this.processCommand(this.commandBar!.value);
                this.commandBar!.value = '';
                this.commandBar!.style.display = 'none';
            } else if(e.key === 'Escape') {
                this.commandBar!.value = '';
                this.commandBar!.style.display = 'none';
            }
        });
    }

    private async processCommand(command: string): Promise<void> {
        if(!command.startsWith('/')) return;

        const parts = command.trim().substring(1).split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if(!this.commandConfig?.commands[cmd]) {
            console.log(`Unknown command: ${cmd}. Type /list for available commands.`);
            return;
        }

        const commandDef = this.commandConfig.commands[cmd];
        const handler = this.spawnHandler.get(commandDef.handler);

        if(!handler) {
            console.log(`No handler for command: ${cmd}`);
            return;
        }

        try {
            await handler(args);
        } catch(err) {
            console.error(`Error executing command:`, err);
        }
    }

    private async handleSpawn(args: string[]): Promise<void> {
        const blockId = args[0];
        const blockDef = ListData.find(item => item.id === blockId);
        if(!blockDef) {
            console.log(`Block ID ${blockId} not found`);
            return;
        }

        let position: vec3;
        if(args.length >= 4) {
            position = vec3.fromValues(
                parseFloat(args[1]),
                parseFloat(args[2]),
                parseFloat(args[3])
            );
        } else {
            const playerPos = this.playerController.getPosition();
            const forward = this.playerController.getForward();
            position = vec3.fromValues(
                playerPos[0] + forward[0] * 3,
                playerPos[1] + forward[1] * 3,
                playerPos[2] + forward[2] * 3
            );
        }

        this.spawnBlock(blockDef, position);
    }

    private async handleClear(): Promise<void> {
        console.log('Cleaning all blocks...');
    }

    private async handleList(): Promise<void> {
        ListData.forEach(block => {
            console.log(`- ${block.id}: ${block.modelPath}`);
        });
    }

    private async spawnBlock(
        blockDef: typeof ListData[0],
        position: vec3
    ): Promise<void> {
        throw new Error('Spawn block err');
    }
}