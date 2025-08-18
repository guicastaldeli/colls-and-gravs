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
        this.connect();
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
            this.textureData.fill(0xFFFF0000);
            console.log('err');
            return;
        }
        const borderColor = this.expandColor(this.paletteStart > 0
            ? (this.cpu.memory.read(this.paletteStart + this.borderColor) || 0) & 0xFFF
            : this.borderColor * 0x111);
        this.textureData.fill(borderColor);
        try {
            const palette = [];
            for (let i = 0; i < 16; i++) {
                palette[i] = this.paletteStart > 0
                    ? (this.cpu.memory.read(this.paletteStart + i) || 0) & 0xFFF
                    : i * 0x111;
            }
            /*
            if(this.vramStart > 0) {
                for(let y = 0; y < this.height; y++) {
                    for(let x = 0; x < this.width; x++) {
                        const vramAddr = Math.floor(y / 8) * 32 + Math.floor(x / 4);
                        const cell = this.cpu.memory.read(this.vramStart + vramAddr) || 0;

                        const fg = (cell >> 12) & 0xF;
                        const bg = (cell >> 8) & 0xF;
                        const char = cell & 0xFF;

                        const fontRow =
                        this.fontStart > 0
                        ? this.cpu.memory.read(this.fontStart + char * 4 + (y % 8)) || 0
                        : 0xFF;

                        const pixelOn = (fontRow >> (7 - (x % 8))) & 1;
                        const color = palette[pixelOn ? fg : bg];
                        this.textureData[y * this.width + x] = this.expandColor(color);
                    }
                }
            }
            */
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const color = (x * 16 / this.width) | ((y * 16 / this.height) << 4);
                    this.textureData[y * this.width + x] = this.expandColor(color);
                }
            }
        }
        catch (err) {
            console.log(err);
            this.textureData.fill(0xFFFFFF00);
        }
    }
    expandColor(color) {
        color = color & 0xFFF;
        const r = ((color >> 8) & 0xF) * 17;
        const g = ((color >> 4) & 0xF) * 17;
        const b = (color & 0xF) * 17;
        const result = (0xFF << 24) | (b << 16) | (g << 8) | r;
        return result;
    }
}
