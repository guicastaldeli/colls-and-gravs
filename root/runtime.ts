export class Runtime {
    private sandbox: any;
    private memorySystem: MemorySystem;
    private hardwareManager: HardwareManager;

    constructor(memorySystem: MemorySystem, hardwareManager: HardwareManager) {
        this.memorySystem = memorySystem;
        this.hardwareManager = hardwareManager;
    }

    private createSandbox(): void {
        this.sandbox = {
            //Memory
            peek: (addr: number) => this.memorySystem.read(addr),
            poke: (addr: number, value: number) => this.memorySystem.write(addr, value)
            
            //Hardware
            getDisplay: () => this.hardwareManager.getDevice(0x7349f615),
            getKeyboard: () => this.hardwareManager.getDevice(0x30cf7406)

            Math: Math,
            Array: Array,
            Uint16Array: Uint16Array
            fetch: undefined,
            XMLHttpRequest: undefined,
            process: undefined,
            require: undefined
        }

        this.sandbox.window = this.sandbox;
        this.sandbox.self = this.sandbox;
    }

    public exec(code: string): void {
        try {
            const wrappedCode = `
                (() => {
                    'use strict';
                    ${code}
                });
            `

            const execute = new Function('sandbox', `with(sandbox) { ${wrappedCode} }`);
            execute(this.sandbox);
        } catch(err) {
            console.error('TS execution error', err);
        }
    }
}