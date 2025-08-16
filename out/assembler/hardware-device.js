export class HardwareDevice {
    device;
    cpu;
    constructor(device, cpu) {
        this.device = device;
        this.cpu = cpu;
    }
    connect(cpu) {
        this.cpu = cpu;
    }
    interrupt(msg) {
        if (this.cpu.registers.IA !== 0) {
            this.cpu.memory.write(--this.cpu.registers.SP, this.cpu.registers.PC);
            this.cpu.memory.write(--this.cpu.registers.SP, this.cpu.registers.A);
            this.cpu.registers.PC = this.cpu.registers.IA;
            this.cpu.registers.A = msg;
        }
    }
}
