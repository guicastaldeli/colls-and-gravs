export class Assembler {
    private opcodes: Record<string, number> = {
        'SET': 0x01,
        'ADD': 0x02,
        'SUB': 0x03,
        'MUL': 0x04,
        'MLI': 0x05,
        'DIV': 0x06,
        'DVI': 0x07,
        'MOD': 0x08,
        'MDI': 0x09,
        'AND': 0x0a,
        'BOR': 0x0b,
        'XOR': 0x0c,
        'SHR': 0x0d,
        'ASR': 0x0e,
        'SHL': 0x0f,
        'IFB': 0x10,
        'IFC': 0x11,
        'IFE': 0x12,
        'IFN': 0x13,
        'IFG': 0x14,
        'IFA': 0x15,
        'IFL': 0x16,
        'IFU': 0x17,
        'ADX': 0x1a,
        'SBX': 0x1b,
        'STI': 0x1e,
        'STD': 0x1f
    }

    private registers: Record<string, number> = {
        'A': 0x00,
        'B': 0x01,
        'C': 0x02,
        'X': 0x03,
        'Y': 0x04,
        'Z': 0x05,
        'I': 0x06,
        'J': 0x07
    }

    private specialRegisters: Record<string, number> = {
        'SP': 0x1b,
        'PC': 0x1c,
        'EX': 0x1d
    }

    public assemble(source: string): Uint16Array {
        const lines = source.split('\n');
        const output: number[] = [];
        const labels: Record<string, number> = {};
        const labelRefs: { addr: number; label: string }[] = [];
        let currentAddr = 0;

        for(const line of lines) {
            const trimmed = this.removeComments(line).trim();
            if(!trimmed) continue;

            if(trimmed.startsWith(':')) {
                const labelName = trimmed.slice(1).trim();
                labels[labelName] = currentAddr;
                continue;
            }

            const [mnemonic, operands] = this.splitInstruction(trimmed);
            if(!mnemonic) continue;
            currentAddr += this.calculateInstructionSize(mnemonic, operands);
        }

        currentAddr = 0;
        for(const line of lines) {
            const trimmed = this.removeComments(line).trim();
            if(!trimmed) continue;
            if(trimmed.startsWith(':')) continue;

            const [mnemonic, operands] = this.splitInstruction(trimmed);
            if(!mnemonic) continue;

            const opcode = this.opcodes[mnemonic.toUpperCase()];
            if(opcode === undefined) throw new Error(`Unknown mnemonic ${mnemonic}`);

            if(operands) {
                const [a, b, extraWords] = this.parseOperands(operands, currentAddr, labelRefs, output.length);
                const instruction = opcode | (a << 4) | (b << 10);
                output.push(instruction);

                for(const word of extraWords) {
                    output.push(word);
                    currentAddr++;
                }
            } else {
                output.push(opcode);
            }
            currentAddr++;
        }

        for(const ref of labelRefs) {
            const targetAddr = labels[ref.label];
            if(targetAddr === undefined) throw new Error(`Undefined label ${ref.label}`);
            output[ref.addr] = targetAddr;
        }

        return new Uint16Array(output);
    }

    private calculateInstructionSize(mnemonic: string, operands?: string): number {
        if(!operands) return 1;

        const [a, b] = operands.split(',').map(op => op.trim());
        let size = 1;
        if(a && this.needsExtraWord(a)) size++;
        if(b && this.needsExtraWord(b)) size++;
        return size;
    }

    private needsExtraWord(operand: string): boolean {
        if(operand.startsWith('[') && operand.endsWith(']')) {
            const inner = operand.slice(1, -1).trim();
            return !(inner in this.registers) && !(inner in this.specialRegisters);
        }
        return this.parseLiteral(operand) > 0x1f;
    }

    private parseOperands(
        operands: string,
        currentAddr: number,
        labelRefs: { addr: number; label: string }[],
        outputLength: number
    ): [number, number, number[]] {
        const [a, b] = operands.split(',').map(op => op.trim());
        const extraWords: number[] = [];

        const aParam = this.parseOperand(a, currentAddr, labelRefs, outputLength, extraWords);
        const bParam = this.parseOperand(b, currentAddr, labelRefs, outputLength, extraWords);
        return [aParam, bParam, extraWords];
    }

    private parseOperand(
        op: string,
        currentAddr: number,
        labelRefs: { addr: number; label: string }[],
        outputLength: number,
        extraWords: number[]
    ): number {
        if(!op) return 0;
        if(op in this.registers) return this.registers[op];
        if(op in this.specialRegisters) return this.specialRegisters[op];
        if(op.startsWith('[') && op.endsWith(']')) {
            const inner = op.slice(1, -1).trim();
            if(inner in this.registers) return 0x08 + this.registers[inner];
            if(inner in this.specialRegisters) return 0x08 + this.specialRegisters[inner];

            const literal = this.parseLiteralOrLabel(inner, labelRefs, outputLength + extraWords.length);
            extraWords.push(literal);
            return 0x1e;
        }

        /* <---- HERE!!!!!!!!!!!!!!!!!!!!!!!!!!! (fix later)
        const literal = this.parseLiteralOrLabel(op, labelRefs, outputLength + extraWords.length);
        if(literal <= 0x1f) return 0x20 + literal;
        extraWords.push(literal);
        */
        return 0x1f;
    }

    private parseLiteralOrLabel(
        value: string,
        labelRefs: { addr: number; label: string }[],
        extraWordIndex: number
    ): number {
        const literal = this.parseLiteral(value);
        if(literal >= 0) return literal;

        labelRefs.push({
            addr: extraWordIndex,
            label: value
        });
        return 0;
    }

    private parseLiteral(value: string): number {
        const regex = /^\d+$/;
        if(value.startsWith('0x')) return parseInt(value.slice(2), 16);
        if(value.startsWith('0b')) return parseInt(value.slice(2), 2);
        if(regex.test(value)) return parseInt(value, 10);
        return -1;
    }

    private removeComments(line: string): string {
        const commentIndex = line.indexOf(';');
        return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    }

    private splitInstruction(line: string): [string, string | undefined] {
        const firstSpace = line.indexOf(' ');
        if(firstSpace < 0) return [line, undefined];
        return [
            line.slice(0, firstSpace),
            line.slice(firstSpace + 1).trim()
        ];
    }
}