import { HardwareDevice } from "./hardware-device.js";
import { MemorySystem } from "./memory-system.js";
import { C16 } from "./c16.js";

export class Display extends HardwareDevice {
    public readonly hardwareId: number = 0x7349f615;

    private vramStart: number = 0;
    private fontStart: number = 0;
    private paletteStart: number = 0;
    private borderColor: number = 0;

    private width: number = 128;
    private height: number = 96;
    private texture: GPUTexture;
    private textureData: Uint32Array;
    private needsUpdate: boolean = false;
    private memory: MemorySystem;

    constructor(device: GPUDevice, cpu: C16) {
        super(device, cpu);
        this.texture = this.createDefaultTexture();
        this.textureData = new Uint32Array(this.width * this.height);
        this.memory = cpu.memory;
    }

    public connect(): void {
        this.memory = this.cpu.memory;
        if(this.vramStart > 0) {
            for(let i = 0; i < (this.width * this.height / 2); i++) {
                this.memory.watch(this.vramStart + i, () => {
                    this.needsUpdate = true;
                });
            }
        }
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

    public getTexture(): GPUTexture {
        return this.texture;
    }

    public update(): void {
        if(!this.needsUpdate) return;
        const textureBuffer = new Uint8Array(this.textureData.buffer as ArrayBuffer);

        this.device.queue.writeTexture(
            { texture: this.texture },
            textureBuffer,
            { bytesPerRow: this.width * 4 },
            { width: this.width, height: this.height }
        );

        this.needsUpdate = true;
    }

    public onMemoryWrite(addr: number, value: number): void {
        if(addr === 0) {
            //MAP_SCREEN
            this.vramStart = value;
            this.needsUpdate = true;
        } else if(addr === 1) {
            //MAP_FONT
            this.fontStart = value;
            this.needsUpdate = true;
        } else if(addr === 2) {
            //MAP_PALETTE
            this.paletteStart = value;
            this.needsUpdate = true;
        } else if(addr === 3) {
            //SET_BORDER_COLOR
            this.borderColor = value & 0xF;
            this.needsUpdate = true;
        }
        if(addr >= this.vramStart &&
            addr < this.vramStart +
            (this.width * this.height / 2)
        ) {
            this.needsUpdate = true;
        }
    }

    private renderToTexture(): void {
        if(!this.cpu) return;

        const font: number[] = [];
        for(let i = 0; i < 256 * 4; i++) {
            font.push(this.cpu.memory.read(this.fontStart + i));
        }

        const palette: number[] = [];
        for(let i = 0; i < 16; i++) {
            palette.push(this.cpu.memory.read(this.paletteStart + i));
        }

        const vram: number[] = [];
        for(let i = 0; i < (this.width * this.height / 2); i++) {
            vram.push(this.cpu.memory.read(this.vramStart + i));
        }

        for(let y = 0; y < this.height; y++) {
            for(let x = 0; x < this.width; x++) {
                const cell = vram[Math.floor(y / 8) * 32 + Math.floor(x / 4)];
                const fg = (cell >> 12) & 0xF;
                const bg = (cell >> 8) & 0xF;
                const char = cell & 0xFF;

                const fontRow = font[char * 4 + (y % 8)];
                const pixelOn = (fontRow >> (7 - (x % 8))) & 1;
                const color = pixelOn ? palette[fg] : palette[bg];
                this.textureData[y * this.width + x] = this.expandColor(color);
            }
        }
    }

    private expandColor(color: number): number {
        const r = ((color >> 8) & 0xF) * 17;
        const g = ((color >> 4) & 0xF) * 17;
        const b = (color & 0xF) * 17;
        return (r << 24) | (g << 16) | (b << 8) | 0xFF;
    } 
}