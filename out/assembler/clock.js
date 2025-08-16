import { HardwareDevice } from "./hardware-device.js";
export class Clock extends HardwareDevice {
    hardwareId = 0x12d0b402;
    ticks = 0;
    tickRate = 60;
    lastTickTime = 0;
    interruptMessage = 0;
    configRegister = 0;
    constructor(device, cpu) {
        super(device, cpu);
        this.lastTickTime = performance.now();
    }
    connect(cpu) {
        super.connect(cpu);
    }
    update() {
        const now = performance.now();
        const delta = now - this.lastTickTime;
        if (delta >= (1000 / this.tickRate)) {
            this.ticks++;
            this.lastTickTime = now;
            if ((this.configRegister & 0x1) && this.interruptMessage !== 0) {
                this.interrupt(this.interruptMessage);
            }
        }
    }
    onMemoryWrite(addr, value) {
        switch (addr) {
            case 0:
                this.interruptMessage = value;
                break;
            case 1:
                this.configRegister = value;
                break;
            case 2:
                this.tickRate = Math.max(1, Math.min(1000, value));
                break;
        }
    }
    onMemoryRead(addr) {
        switch (addr) {
            case 0:
                return this.ticks & 0xFFFF;
            case 1:
                return (this.ticks >> 16) & 0xFFFF;
            case 2:
                return this.configRegister;
            default:
                return 0;
        }
    }
}
