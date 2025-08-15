export class MemorySystem {
    memory;
    observers = new Map();
    constructor(size) {
        this.memory = new Uint16Array(size);
    }
    read(addr) {
        if (addr < 0 || addr >= this.memory.length)
            throw new Error(`Memory access err ${addr.toString(16)}`);
        return this.memory[addr];
    }
    write(addr, value) {
        if (addr < 0 || addr >= this.memory.length)
            throw new Error(`Memory access err ${addr.toString(16)}`);
        this.memory[addr] = value & 0xFFFF;
        if (this.observers.has(addr))
            this.observers.get(addr)(value);
    }
    load(offset, data) {
        this.memory.set(data, offset);
    }
    watch(addr, callback) {
        this.observers.set(addr, callback);
    }
}
