export class MemorySystem {
    private memory: Uint16Array;
    private observers: Map<number, (value: number) => void> = new Map();

    constructor(size: number) {
        this.memory = new Uint16Array(size);
    }

    public read(addr: number): number {
        if(addr < 0 || addr >= this.memory.length) throw new Error(`Memory access err ${addr.toString(16)}`);
        return this.memory[addr];
    }

    public write(addr: number, value: number): void {
        if(addr < 0 || addr >= this.memory.length) throw new Error(`Memory access err ${addr.toString(16)}`);
        this.memory[addr] = value & 0xFFFF;
        if(this.observers.has(addr)) this.observers.get(addr)!(value);
    }

    public load(offset: number, data: Uint16Array): void {
        this.memory.set(data, offset);
    }

    public watch(addr: number, callback: (value: number) => void): void {
        this.observers.set(addr, callback);
    }
}