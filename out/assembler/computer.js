import { Runtime } from "../runtime.js";
import { Display } from "./display.js";
import { HardwareManager } from "./hardware-manager.js";
import { MemorySystem } from "./memory-system.js";
import { C16 } from "./c16.js";
import { Assembler } from "./assembler.js";
import { Clock } from "./clock.js";
import { Keyboard } from "./keyboard.js";
export class Computer {
    device;
    cpu;
    memory;
    hardware;
    runtime;
    assembler;
    width = 128;
    height = 96;
    constructor(device) {
        this.device = device;
        this.memory = new MemorySystem(0x10000);
        this.cpu = new C16(this.memory);
        this.hardware = new HardwareManager();
        this.runtime = new Runtime(this.memory, this.hardware);
        this.assembler = new Assembler();
        this.setupHardware();
    }
    setupHardware() {
        const display = new Display(this.device, this.cpu);
        const keyboard = new Keyboard(this.device, this.cpu);
        const clock = new Clock(this.device, this.cpu);
        this.hardware.registerDevice(display);
        this.hardware.registerDevice(keyboard);
        this.hardware.registerDevice(clock);
        display.connect();
        keyboard.connect(this.cpu);
        clock.connect(this.cpu);
    }
    loadAssembly(source) {
        const program = this.assembler.assemble(source);
        this.memory.load(0x0000, program);
        this.cpu.reset();
    }
    execScript(code) {
        this.runtime.exec(code);
    }
    run(cycles) {
        this.cpu.exec(cycles);
        this.hardware.update();
    }
    createDefaultTexture() {
        return this.device.createTexture({
            size: [this.width, this.height],
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT
        });
    }
    getDisplayTexture() {
        const display = this.hardware.getDevice(0x7349f615);
        return display?.getTexture() || this.createDefaultTexture();
    }
}
