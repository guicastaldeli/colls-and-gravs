import { HardwareDevice } from "./hardware-device.js";
export class Keyboard extends HardwareDevice {
    hardwareId = 0x30cf7406;
    keyBuffer = [];
    interruptMessage = 0;
    lastKey = 0;
    keyStates = {};
    constructor(device, cpu) {
        super(device, cpu);
        this.setupEventListeners();
    }
    connect(cpu) {
        super.connect(cpu);
    }
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keydown', (e) => this.handleKeyUp(e));
    }
    handleKeyDown(e) {
        e.preventDefault();
        const keyCode = this.translateKeyCode(e);
        if (keyCode === 0 || this.keyStates[keyCode])
            return;
        if (!this.keyStates[keyCode]) {
            this.keyBuffer.push(keyCode);
            this.lastKey = keyCode;
            if (this.interruptMessage !== 0)
                this.interrupt(this.interruptMessage);
        }
        this.keyStates[keyCode] = true;
    }
    handleKeyUp(e) {
        const keyCode = this.translateKeyCode(e);
        if (keyCode !== 0)
            this.keyStates[keyCode] = false;
    }
    onMemoryWrite(addr, value) {
        switch (addr) {
            case 0:
                this.interruptMessage = value;
                break;
            case 1:
                this.keyBuffer = [];
                break;
        }
    }
    onMemoryRead(addr) {
        switch (addr) {
            case 0:
                return this.keyBuffer.shift() || 0;
            case 1:
                return this.lastKey;
            case 2:
                return this.keyStates[this.lastKey] ? 1 : 0;
            default:
                return 0;
        }
    }
    translateKeyCode(e) {
        const map = {
            'Backspace': 0x10,
            'Tab': 0x11,
            'Enter': 0x12,
            'Shift': 0x90,
            'Control': 0x91,
            'Alt': 0x92,
            'Escape': 0x1b,
            'Space': 0x20,
            'ArrowUp': 0x80,
            'ArrowDown': 0x81,
            'ArrowLeft': 0x82,
            'ArrowRight': 0x83
        };
        if (map[e.code])
            return map[e.code];
        if (e.key.length === 1) {
            const code = e.key.charCodeAt(0);
            if (code >= 32 && code <= 126)
                return code;
        }
        return 0;
    }
    update() { }
}
