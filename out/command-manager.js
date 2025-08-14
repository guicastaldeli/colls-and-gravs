import { vec3 } from "../node_modules/gl-matrix/esm/index.js";
import { ListData } from "./env/obj/random-blocks/list.js";
export class CommandManager {
    canvas;
    input;
    playerController;
    randomBlocks;
    commandBar = null;
    commandConfig = null;
    spawnHandler = new Map();
    constructor(canvas, input, playerController, randomBlocks) {
        this.canvas = canvas;
        this.input = input;
        this.playerController = playerController;
        this.randomBlocks = randomBlocks;
        this.registerHandlers();
    }
    async loadCommands() {
        try {
            const res = await fetch('./.data/command-list.json');
            this.commandConfig = await res.json();
        }
        catch (err) {
            console.error('Failed to load commands', err);
            this.commandConfig = { commands: {} };
        }
    }
    async registerHandlers() {
        this.spawnHandler.set('handleSpawn', this.handleSpawn.bind(this));
        this.spawnHandler.set('handleClear', this.handleClear.bind(this));
        this.spawnHandler.set('handleList', this.handleList.bind(this));
    }
    async showCommandBar() {
        document.addEventListener('keydown', async (e) => {
            const eKey = e.key.toLowerCase();
            if (eKey === 'y') {
                e.preventDefault();
                this.input.setCommandBarOpen(true);
                this.input.exitPointerLock(true);
                await this.createCommandBar();
                this.commandBar?.focus();
            }
        });
    }
    async createCommandBar() {
        if (this.commandBar) {
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
        if (!commandContainer)
            throw new Error('Command bar err');
        const commandBarElement = commandContainer.cloneNode(true);
        document.body.appendChild(commandBarElement);
        this.commandBar = commandBarElement;
        //Empty
        this.commandBar.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.input.setCommandBarOpen(false);
                this.input.lockPointer(this.canvas);
                await this.processCommand(this.commandBar.value);
                this.commandBar.value = '';
                this.commandBar.style.display = 'none';
            }
            else if (e.key === 'Escape') {
                this.input.setCommandBarOpen(false);
                this.commandBar.value = '';
                this.commandBar.style.display = 'none';
            }
        });
    }
    async processCommand(command) {
        if (!command.startsWith('/'))
            return;
        const parts = command.trim().substring(1).split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        if (!this.commandConfig?.commands[cmd])
            throw new Error(`Unknown command: ${cmd}. Type /list for available commands.`);
        const commandDef = this.commandConfig.commands[cmd];
        const handler = this.spawnHandler.get(commandDef.handler);
        try {
            if (!handler)
                throw new Error(`No handler for command: ${cmd}`);
            await handler(args);
        }
        catch (err) {
            console.error(`Error executing command:`, err);
        }
    }
    async handleSpawn(args) {
        const id = args[0];
        let blockDef = ListData.find(item => item.id === id);
        if (!blockDef)
            blockDef = ListData.find(item => item.id_attr === id);
        if (!blockDef)
            throw new Error(`Block with ID or attribute '${id}' not found`);
        let position;
        const playerPos = this.playerController.getPosition();
        const forward = this.playerController.getForward();
        if (args.length >= 4) {
            position = vec3.fromValues(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]));
        }
        else {
            position = vec3.fromValues(playerPos[0] + forward[0] * 3, playerPos[1] + forward[1] * 3, playerPos[2] + forward[2] * 3);
        }
        this.spawnBlock(position, blockDef.id);
    }
    async handleClear() {
        console.log('Cleaning all blocks...');
    }
    async handleList() {
        ListData.forEach(block => {
            console.log(`- ${block.id}: ${block.modelPath}`);
        });
    }
    async spawnBlock(position, id) {
        try {
            this.randomBlocks.addBlock(position, this.playerController, undefined, id);
            this.playerController.updateCollidables();
        }
        catch (err) {
            throw new Error('Spawn block err');
        }
    }
    async init() {
        await this.loadCommands();
        this.showCommandBar();
    }
}
