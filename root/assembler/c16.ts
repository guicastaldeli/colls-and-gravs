import { MemorySystem } from "./memory-system.js"

export class C16 {
    public memory: MemorySystem;

    public registers = {
        A: 0,
        B: 0,
        C: 0,
        X: 0,
        Y: 0,
        Z: 0,
        I: 0,
        J: 0,
        PC: 0,
        SP: 0xFFFF,
        EX: 0,
        IA: 0
    }

    constructor(memory: MemorySystem) {
        this.memory = memory;
    }

    public exec(cycles: number): void {
        while(cycles-- > 0) {
            const instruction = this.memory.read(this.registers.PC++);
            this.execInstruction(instruction);
        }
    }

    private execInstruction(instruction: number): void {
        const opcode = instruction & 0xF;
        const a = (instruction >> 4) & 0x3F;
        const b = (instruction >> 10) & 0x3F;

        switch(opcode) {
            case 0x01:
                this.setValue(a, this.getValue(b));
                break;
            case 0x02:
                const sum = this.getValue(a) + this.getValue(b);
                this.registers.EX = sum > 0xFFFF ? 1 : 0;
                this.setValue(a, sum & 0xFFFF);
                break;
            case 0x03:
                const diff = this.getValue(a) - this.getValue(b);
                this.registers.EX = diff < 0 ? 0xFFFF : 0;
                this.setValue(a, diff & 0xFFFF);
                break;
            case 0x04:
                const product = this.getValue(a) * this.getValue(b);
                this.registers.EX = (product >> 16) & 0xFFFF;
                this.setValue(a, product & 0xFFFF);
                break;
            case 0x05:
                const signedProduct = this.getSignedValue(a) * this.getSignedValue(b);
                this.registers.EX = (signedProduct >> 16) & 0xFFFF;
                this.setValue(a, signedProduct & 0xFFFF);
            default:
                throw new Error(`Unknow opcode 0x${opcode.toString(16)}`);
        }
    }

    private getValue(param: number): number {
        if(param <= 0x07) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            return this.registers[regNames[param]];
        }
        if(param <= 0x0F) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x08]];
            return this.memory.read(addr);
        }
        if(param <= 0x17) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x10]] + this.memory.read(this.registers.PC++);
            return this.memory.read(addr);
        }

        //Special Registers
        if(param === 0x18) return this.memory.read(this.registers.SP++); //POP
        if(param === 0x19) return this.memory.read(this.registers.SP); //PEEK
        if(param === 0x1A) return this.memory.read(this.registers.SP + this.memory.read(this.registers.PC++));
        if(param === 0x1B) return this.registers.SP;
        if(param === 0x1C) return this.registers.PC;
        if(param === 0x1D) return this.registers.EX;
        
        //Literals
        if(param === 0x1E) return this.memory.read(this.memory.read(this.registers.PC++)); //[next word]
        if(param === 0x1F) return this.memory.read(this.registers.PC++); //literal
        if(param >= 0x20) return param - 0x20;
        throw new Error(`Invalid param value 0x${param.toString(16)}`);
    }

    private getSignedValue(param: number): number {
        const value = this.getValue(param);
        return value > 0x7FFF ? value - 0x10000 : value;
    }

    private setValue(param: number, value: number): void {
        value = value & 0xFFFF;
        
        if(param <= 0x07) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            this.registers[regNames[param]] = value;
            return;
        }
        if(param <= 0x0F) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x08]];
            this.memory.write(addr, value);
            return;
        }
        if(param <= 0x17) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x10]] + this.memory.read(this.registers.PC++);
            this.memory.write(addr, value);
            return;
        }
        
        //Special Registers
        if(param === 0x18) { //PUSH
            this.memory.write(--this.registers.SP, value);
            return;
        }
        if(param === 0x19) { //POKE
            this.memory.write(this.registers.SP, value);
            return;
        }
        if(param === 0x1A) {
            const addr = this.registers.SP + this.memory.read(this.registers.SP++);
            this.memory.write(addr, value);
            return;
        }
        if(param === 0x1B) {
            this.registers.SP = value;
            return;
        }
        if(param === 0x1C) {
            this.registers.PC = value;
            return;
        }
        if(param === 0x1D) {
            this.registers.EX = value;
            return;
        }

        //Literals
        if(param === 0x1E) {
            const addr = this.memory.read(this.registers.PC++);
            this.memory.write(addr, value);
            return;
        }
        if(param === 0x1F) {
            throw new Error('Cannot write to literal value');
        }
        if(param >= 0x20) {
            throw new Error('Cannot write to literal value');
        }
        throw new Error(`Invalid param value: 0x${param.toString(16)}`);
    }
}