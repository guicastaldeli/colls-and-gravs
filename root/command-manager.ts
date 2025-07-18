import { mat3, mat4, vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { ListData } from "./env/obj/random-blocks/list.js";
import { PlayerController } from "./player/player-controller.js";
import { Input } from "./input.js";
import { RandomBlocks } from "./env/obj/random-blocks/random-blocks.js";

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
    private canvas: HTMLCanvasElement;
    private input: Input;
    private playerController: PlayerController;
    private randomBlocks: RandomBlocks | any;

    private commandBar: HTMLInputElement | null = null;
    private commandConfig: CommandConfig | null = null;
    private spawnHandler: Map<string, (args: string[]) => Promise<void>> = new Map();

    constructor(
        canvas: HTMLCanvasElement,
        input: Input, 
        playerController: PlayerController,
        randomBlocks: RandomBlocks | any
    ) {
        this.canvas = canvas;
        this.input = input;
        this.playerController = playerController;
        this.randomBlocks = randomBlocks;
        this.registerHandlers();
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

    private async showCommandBar(): Promise<void> {
        document.addEventListener('keydown', async (e) => {
            const eKey = e.key.toLowerCase();

            if(eKey === 'y') {
                e.preventDefault();
                this.input.setCommandBarOpen(true);
                this.input.exitPointerLock(true);
                await this.createCommandBar();
                this.commandBar?.focus();
            }
        });
    }
    
    private async createCommandBar(): Promise<void> {
        if(this.commandBar) {
            this.commandBar.style.display = 'block';
            this.input.setCommandBarOpen(true);
            return;
        }

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
        document.body.appendChild(commandBarElement);
        this.commandBar = commandBarElement;

        //Empty
        this.commandBar.addEventListener('keydown', async (e) => {
            if(e.key === 'Enter') {
                e.preventDefault();
                this.input.setCommandBarOpen(false);
                this.input.lockPointer(this.canvas);
                await this.processCommand(this.commandBar!.value);
                this.commandBar!.value = '';
                this.commandBar!.style.display = 'none';
            } else if(e.key === 'Escape') {
                this.input.setCommandBarOpen(false);
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
        const id = args[0];
        let blockDef = ListData.find(item => item.id === id);
        if(!blockDef) blockDef = ListData.find(item => item.id_attr === id);
        if (!blockDef) {
            console.log(`Block with ID or attribute '${id}' not found`);
            return;
        }

        let position: vec3;
        const playerPos = this.playerController.getPosition();
        const forward = this.playerController.getForward();

        if(args.length >= 4) {
            position = vec3.fromValues(
                parseFloat(args[1]),
                parseFloat(args[2]),
                parseFloat(args[3])
            );
        } else {
            position = vec3.fromValues(
                playerPos[0] + forward[0] * 3,
                playerPos[1] + forward[1] * 3,
                playerPos[2] + forward[2] * 3
            );
        }

        this.spawnBlock(position, blockDef.id);
    }

    private async handleClear(): Promise<void> {
        console.log('Cleaning all blocks...');
    }

    private async handleList(): Promise<void> {
        ListData.forEach(block => {
            console.log(`- ${block.id}: ${block.modelPath}`);
        });
    }

    private async spawnBlock(position: vec3, id: string): Promise<void> {
        try {
            this.randomBlocks.addBlock(position, this.playerController, undefined, id);
            this.playerController.updateCollidables();
        } catch(err) {
            throw new Error('Spawn block err');
        }
    }

    public async init(): Promise<void> {
        await this.loadCommands();
        this.showCommandBar();
    }
}