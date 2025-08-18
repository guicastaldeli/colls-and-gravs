export class C16 {
    memory;
    registers = {
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
    };
    constructor(memory) {
        this.memory = memory;
    }
    exec(cycles) {
        while (cycles-- > 0) {
            const instruction = this.memory.read(this.registers.PC++);
            this.execInstruction(instruction);
        }
    }
    execInstruction(instruction) {
        const opcode = instruction & 0xF;
        const a = (instruction >> 4) & 0x3F;
        const b = (instruction >> 10) & 0x3F;
        const isWriteOperation = [
            0x01,
            0x02,
            0x03,
            0x04,
            0x05,
            0x0a,
            0x0b,
            0x0c,
            0x0d,
            0x0e,
            0x0f
        ].includes(opcode);
        if (isWriteOperation) {
            if (a > 0x1F || (a >= 0x20 && a <= 0x3F)) {
                throw new Error(`Cannot write to literal value in instruction 0x${instruction.toString(16)}`);
            }
        }
        switch (opcode) {
            case 0x00:
                break;
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
                break;
            case 0x06:
                const dividend = this.getValue(a);
                const divisor = this.getValue(b);
                if (divisor === 0) {
                    this.setValue(a, 0);
                    this.registers.EX = 0;
                }
                else {
                    this.setValue(a, Math.floor(dividend / divisor) & 0xFFFF);
                    this.registers.EX = ((dividend % divisor) << 16) / divisor & 0xFFFF;
                }
            case 0x0a:
                this.setValue(a, this.getValue(a) & this.getValue(b));
                break;
            case 0x0b:
                this.setValue(a, this.getValue(a) | this.getValue(b));
                break;
            case 0x0c:
                this.setValue(a, this.getValue(a) ^ this.getValue(b));
                break;
            case 0x0d:
                const shrResult = this.getValue(a) >>> this.getValue(b);
                this.registers.EX = ((this.getValue(a) << (16 - this.getValue(b))) & 0xFFFF);
                this.setValue(a, shrResult);
                break;
            case 0x0e:
                const asrResult = this.getSignedValue(a) >> this.getValue(b);
                this.registers.EX = ((this.getValue(a) << (16 - this.getValue(b))) & 0xFFFF);
                this.setValue(a, asrResult & 0xFFFF);
                break;
            case 0x0f:
                const shlResult = this.getValue(a) << this.getValue(b);
                this.registers.EX = ((this.getValue(a) << (16 - this.getValue(b))) & 0xFFFF);
                this.setValue(a, shlResult & 0xFFFF);
                break;
            default:
                throw new Error(`Unknow opcode 0x${opcode.toString(16)}`);
        }
    }
    getValue(param) {
        if (param <= 0x07) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            return this.registers[regNames[param]];
        }
        if (param <= 0x0F) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x08]];
            return this.memory.read(addr);
        }
        if (param <= 0x17) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x10]] + this.memory.read(this.registers.PC++);
            return this.memory.read(addr);
        }
        //Special Registers
        if (param === 0x18)
            return this.memory.read(this.registers.SP++); //POP
        if (param === 0x19)
            return this.memory.read(this.registers.SP); //PEEK
        if (param === 0x1A)
            return this.memory.read(this.registers.SP + this.memory.read(this.registers.PC++));
        if (param === 0x1B)
            return this.registers.SP;
        if (param === 0x1C)
            return this.registers.PC;
        if (param === 0x1D)
            return this.registers.EX;
        //Literals
        if (param === 0x1E)
            return this.memory.read(this.memory.read(this.registers.PC++)); //[next word]
        if (param === 0x1F)
            return this.memory.read(this.registers.PC++); //literal
        if (param >= 0x20)
            return param - 0x20;
        throw new Error(`Invalid param value 0x${param.toString(16)}`);
    }
    getSignedValue(param) {
        const value = this.getValue(param);
        return value > 0x7FFF ? value - 0x10000 : value;
    }
    setValue(param, value) {
        value = value & 0xFFFF;
        if (param <= 0x07) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            this.registers[regNames[param]] = value;
            return;
        }
        if (param <= 0x0F) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x08]];
            this.memory.write(addr, value);
            return;
        }
        if (param <= 0x17) {
            const regNames = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'];
            const addr = this.registers[regNames[param - 0x10]] + this.memory.read(this.registers.PC++);
            this.memory.write(addr, value);
            return;
        }
        //Special Registers
        if (param === 0x18) { //PUSH
            this.memory.write(--this.registers.SP, value);
            return;
        }
        if (param === 0x19) { //POKE
            this.memory.write(this.registers.SP, value);
            return;
        }
        if (param === 0x1A) {
            const addr = this.registers.SP + this.memory.read(this.registers.SP++);
            this.memory.write(addr, value);
            return;
        }
        if (param === 0x1B) {
            this.registers.SP = value;
            return;
        }
        if (param === 0x1C) {
            this.registers.PC = value;
            return;
        }
        if (param === 0x1D) {
            this.registers.EX = value;
            return;
        }
        //Literals
        if (param === 0x1E) {
            const addr = this.memory.read(this.registers.PC++);
            this.memory.write(addr, value);
            return;
        }
        if (param === 0x1F) {
            throw new Error(`Cannot set literal value 0x${value.toString(16)}`);
        }
        if (param >= 0x20) {
            throw new Error(`Cannot set small literal value 0x${(param - 0x20).toString(16)}`);
        }
        throw new Error(`Invalid param value: 0x${param.toString(16)}`);
    }
    reset() {
        this.registers = {
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
        };
    }
}
