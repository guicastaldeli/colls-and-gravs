import { C16 } from "./c16.js";

export abstract class HardwareDevice {
    public device: GPUDevice;
    public cpu: C16;
    abstract readonly hardwareId: number;
    abstract update(): void;

    constructor(device: GPUDevice, cpu: C16) {
        this.device = device;
        this.cpu = cpu;
    }

    public connect(cpu: C16) {
        this.cpu = cpu;
    }

    public interrupt(msg: number): void {
        if(this.cpu.registers.IA !== 0) {
            this.cpu.memory.write(--this.cpu.registers.SP, this.cpu.registers.PC);
            this.cpu.memory.write(--this.cpu.registers.SP, this.cpu.registers.A);
            this.cpu.registers.PC = this.cpu.registers.IA;
            this.cpu.registers.A = msg;
        }
    }
}