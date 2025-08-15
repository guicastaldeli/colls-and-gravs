import { Runtime } from "../runtime.js";
import { Display } from "./display.js";
import { HardwareManager } from "./hardware-manager.js";
import { MemorySystem } from "./memory-system.js";
import { C16 } from "./c16.js";
import { Assembler } from "./assembler.js";
import { Clock } from "./clock.js";
import { Keyboard } from "./keyboard.js";

export class Computer {
    private device: GPUDevice;
    private cpu: C16;
    private memory: MemorySystem;
    private hardware: HardwareManager;
    private runtime: Runtime;
    private assembler: Assembler;

    private width: number = 128;
    private height: number = 96;

    constructor(device: GPUDevice) {
        this.device = device;
        this.memory = new MemorySystem(0x10000);
        this.cpu = new C16(this.memory);
        this.hardware = new HardwareManager();
        this.runtime = new Runtime(this.memory, this.hardware);
        this.assembler = new Assembler();
        this.setupHardware();
    }

    private setupHardware(): void {
        const display = new Display(this.device, this.cpu);
        const keyboard = new Keyboard(this.device, this.cpu);
        const clock = new Clock(this.device, this.cpu);

        this.hardware.registerDevice(display);
        this.hardware.registerDevice(keyboard);
        this.hardware.registerDevice(clock);
        
        display.connect();
        keyboard.connect();
        clock.connect();
    }

    public loadAssembly(source: string): void {
        const program = this.assembler.assemble(source);
        this.memory.load(0x0000, program);
        this.cpu.reset();
    }

    public execScript(code: string): void {
        this.runtime.exec(code);
    }

    public run(cycles: number): void {
        this.cpu.exec(cycles);
        this.hardware.update();
    }

    private createDefaultTexture(): GPUTexture {
        return this.device.createTexture({
            size: [this.width, this.height],
            format: 'rgba8unorm',
            usage: 
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT
        });
    }

    public getDisplayTexture(): GPUTexture {
        const display = this.hardware.getDevice<Display>(0x7349f615);
        return display?.getTexture() || this.createDefaultTexture();
    }
}