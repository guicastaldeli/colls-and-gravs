export class Runtime {
    sandbox;
    memorySystem;
    hardwareManager;
    constructor(memorySystem, hardwareManager) {
        this.memorySystem = memorySystem;
        this.hardwareManager = hardwareManager;
        this.createSandbox();
    }
    createSandbox() {
        this.sandbox = {
            //Memory
            peek: (addr) => this.memorySystem.read(addr),
            poke: (addr, value) => this.memorySystem.write(addr, value),
            //Hardware
            getDisplay: () => this.hardwareManager.getDevice(0x7349f615),
            getKeyboard: () => this.hardwareManager.getDevice(0x30cf7406),
            Math: Math,
            Array: Array,
            Uint16Array: Uint16Array,
            fetch: undefined,
            XMLHttpRequest: undefined,
            process: undefined,
            require: undefined
        };
        this.sandbox.window = this.sandbox;
        this.sandbox.self = this.sandbox;
    }
    exec(code) {
        try {
            const wrappedCode = `
                (() => {
                    'use strict';
                    ${code}
                });
            `;
            const execute = new Function('sandbox', `with(sandbox) { ${wrappedCode} }`);
            execute(this.sandbox);
        }
        catch (err) {
            console.error('TS execution error', err);
        }
    }
}
