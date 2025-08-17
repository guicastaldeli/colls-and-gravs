import { HardwareDevice } from "./hardware-device.js";
export class Display extends HardwareDevice {
    hardwareId = 0x7349f615;
    vramStart = 0;
    fontStart = 0;
    paletteStart = 0;
    borderColor = 0;
    width = 128;
    height = 96;
    texture;
    textureData;
    needsUpdate = false;
    memory;
    constructor(device, cpu) {
        super(device, cpu);
        this.texture = this.createDefaultTexture();
        this.textureData = new Uint32Array(this.width * this.height);
        this.memory = cpu.memory;
    }
    connect() {
        this.memory = this.cpu.memory;
        if (this.vramStart > 0) {
            for (let i = 0; i < (this.width * this.height / 2); i++) {
                this.memory.watch(this.vramStart + i, () => {
                    this.needsUpdate = true;
                });
            }
        }
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
    getTexture() {
        return this.texture;
    }
    update() {
        //if(!this.needsUpdate) return;
        this.renderToTexture();
        const textureBuffer = new Uint8Array(this.textureData.buffer);
        this.device.queue.writeTexture({ texture: this.texture }, textureBuffer, { bytesPerRow: this.width * 4 }, { width: this.width, height: this.height });
        this.needsUpdate = false;
    }
    onMemoryWrite(addr, value) {
        if (addr === 0) {
            //MAP_SCREEN
            this.vramStart = value;
            this.needsUpdate = true;
        }
        else if (addr === 1) {
            //MAP_FONT
            this.fontStart = value;
            this.needsUpdate = true;
        }
        else if (addr === 2) {
            //MAP_PALETTE
            this.paletteStart = value;
            this.needsUpdate = true;
        }
        else if (addr === 3) {
            //SET_BORDER_COLOR
            this.borderColor = value & 0xF;
            this.needsUpdate = true;
        }
        if (addr >= this.vramStart &&
            addr < this.vramStart +
                (this.width * this.height / 2)) {
            this.needsUpdate = true;
        }
    }
    renderToTexture() {
        if (!this.cpu) {
            this.textureData.fill(0xFF0000FF);
            return;
        }
        const defaultColor = this.expandColor(0x0F00);
        const font = Array(256 * 4).fill(0xFFFF);
        if (this.fontStart > 0) {
            for (let i = 0; i < 256 * 4; i++) {
                const val = this.cpu.memory.read(this.fontStart + i);
                font[i] = val !== undefined ? val : 0xFFFF;
            }
        }
        const palette = [];
        for (let i = 0; i < 16; i++) {
            palette[i] = this.paletteStart > 0
                ? (this.cpu.memory.read(this.paletteStart + i) || (i * 0x111))
                : (i * 0x111);
        }
        const vram = Array(Math.floor(this.width * this.height / 2)).fill(0xF020);
        if (this.vramStart > 0) {
            for (let i = 0; i < (this.width * this.height / 2); i++) {
                const val = this.cpu.memory.read(this.vramStart + i);
                vram[i] = val !== undefined ? val : 0xF020;
            }
        }
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                try {
                    const cell = vram[Math.floor(y / 8) * 32 + Math.floor(x / 4)];
                    const fg = (cell >> 12) & 0xF;
                    const bg = (cell >> 8) & 0xF;
                    const char = cell & 0xFF;
                    const fontRow = font[char * 4 + (y % 8)];
                    const pixelOn = (fontRow >> (7 - (x % 8))) & 1;
                    const color = pixelOn ? palette[fg] : palette[bg];
                    this.textureData[y * this.width + x] = this.expandColor(color);
                }
                catch (err) {
                    this.textureData[y * this.width + x] = defaultColor;
                    console.log('loading default texture...');
                }
            }
        }
        /*
        console.log('Screen', this.cpu.memory.read(0x8000));
        console.log("Palette:", this.cpu.memory.read(0x3000));
        console.log("Font:", this.cpu.memory.read(0x4000));
        console.log('First VRAM cell:', vram[0]);
        console.log('First font entry:', font[0]);
        console.log('First palette color:', palette[0]);
        */
    }
    expandColor(color) {
        const r = ((color >> 8) & 0xF) * 17;
        const g = ((color >> 4) & 0xF) * 17;
        const b = (color & 0xF) * 17;
        return (r << 24) | (g << 16) | (b << 8) | 0xFF;
    }
}
