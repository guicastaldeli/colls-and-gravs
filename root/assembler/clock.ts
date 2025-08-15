import { HardwareDevice } from "./hardware-device.js";
import { C16 } from "./c16.js";

export class Clock extends HardwareDevice {
    public readonly hardwareId: number = 0x12d0b402;
    private ticks: number = 0;
    private tickRate: number = 60;
    private lastTickTime: number = 0;
    private interruptMessage: number = 0;
    private configRegister: number = 0;

    constructor(device: GPUDevice, cpu: C16) {
        super(device, cpu);
        this.lastTickTime = performance.now();
    }

    public update(): void {
        const now = performance.now();
        const delta = now - this.lastTickTime;

        if(delta >= (1000 / this.tickRate)) {
            this.ticks++;
            this.lastTickTime = now;
            if((this.configRegister & 0x1) && this.interruptMessage !== 0) {
                this.interrupt(this.interruptMessage);
            }
        }
    }

    public onMemoryWrite(addr: number, value: number): void {
        switch(addr) {
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

    public onMemoryRead(addr: number): number {
        switch(addr) {
            case 0:
                return this.ticks & 0xFFFF;
            case 1:
                return (this.ticks >> 16) & 0xFFFF
            case 2:
                return this.configRegister;
            default:
                return 0;
        }
    }
}