export class Assembler {
    opcodes = {
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
    };
    registers = {
        'A': 0x00,
        'B': 0x01,
        'C': 0x02,
        'X': 0x03,
        'Y': 0x04,
        'Z': 0x05,
        'I': 0x06,
        'J': 0x07
    };
    specialRegisters = {
        'SP': 0x1b,
        'PC': 0x1c,
        'EX': 0x1d
    };
    assemble(source) {
        const lines = source.split('\n');
        const output = [];
        const labels = {};
        const labelRefs = [];
        let currentAddr = 0;
        for (const line of lines) {
            const trimmed = this.removeComments(line).trim();
            if (!trimmed)
                continue;
            if (trimmed.startsWith(':')) {
                const labelName = trimmed.slice(1).trim();
                labels[labelName] = currentAddr;
                continue;
            }
            const [mnemonic, operands] = this.splitInstruction(trimmed);
            if (!mnemonic)
                continue;
            currentAddr += this.calculateInstructionSize(mnemonic, operands);
        }
        currentAddr = 0;
        for (const line of lines) {
            const trimmed = this.removeComments(line).trim();
            if (!trimmed)
                continue;
            if (trimmed.startsWith(':'))
                continue;
            const [mnemonic, operands] = this.splitInstruction(trimmed);
            if (!mnemonic)
                continue;
            const opcode = this.opcodes[mnemonic.toUpperCase()];
            if (opcode === undefined)
                throw new Error(`Unknown mnemonic ${mnemonic}`);
            if (operands) {
                const [a, b, extraWords] = this.parseOperands(operands, currentAddr, labelRefs, output.length);
                const instruction = opcode | (a << 4) | (b << 10);
                output.push(instruction);
                for (const word of extraWords) {
                    output.push(word);
                    currentAddr++;
                }
            }
            else {
                output.push(opcode);
            }
            currentAddr++;
        }
        for (const ref of labelRefs) {
            const targetAddr = labels[ref.label];
            if (targetAddr === undefined)
                throw new Error(`Undefined label ${ref.label}`);
            output[ref.addr] = targetAddr;
        }
        return new Uint16Array(output);
    }
    calculateInstructionSize(mnemonic, operands) {
        if (!operands)
            return 1;
        const [a, b] = operands.split(',').map(op => op.trim());
        let size = 1;
        if (a && this.needsExtraWord(a))
            size++;
        if (b && this.needsExtraWord(b))
            size++;
        return size;
    }
    needsExtraWord(operand) {
        if (operand.startsWith('[') && operand.endsWith(']')) {
            const inner = operand.slice(1, -1).trim();
            return !(inner in this.registers) && !(inner in this.specialRegisters);
        }
        return this.parseLiteral(operand) > 0x1f;
    }
    parseOperands(operands, currentAddr, labelRefs, outputLength) {
        const [a, b] = operands.split(',').map(op => op.trim());
        const extraWords = [];
        const aParam = this.parseOperand(a, currentAddr, labelRefs, outputLength, extraWords);
        const bParam = this.parseOperand(b, currentAddr, labelRefs, outputLength, extraWords);
        return [aParam, bParam, extraWords];
    }
    parseOperand(op, currentAddr, labelRefs, outputLength, extraWords) {
        if (!op)
            return 0;
        if (op in this.registers)
            return this.registers[op];
        if (op in this.specialRegisters)
            return this.specialRegisters[op];
        if (op.startsWith('[') && op.endsWith(']')) {
            const inner = op.slice(1, -1).trim();
            if (inner in this.registers)
                return 0x08 + this.registers[inner];
            if (inner in this.specialRegisters)
                return 0x08 + this.specialRegisters[inner];
            const literal = this.parseLiteralOrLabel(inner, labelRefs, outputLength + extraWords.length);
            extraWords.push(literal);
            return 0x1e;
        }
        const literal = this.parseLiteralOrLabel(op, labelRefs, outputLength + extraWords.length);
        if (literal <= 0x1f)
            return 0x20 + literal;
        extraWords.push(literal);
        return 0x1f;
    }
    parseLiteralOrLabel(value, labelRefs, extraWordIndex) {
        const literal = this.parseLiteral(value);
        if (literal >= 0)
            return literal;
        labelRefs.push({
            addr: extraWordIndex,
            label: value
        });
        return 0;
    }
    parseLiteral(value) {
        const regex = /^\d+$/;
        if (value.startsWith('0x'))
            return parseInt(value.slice(2), 16);
        if (value.startsWith('0b'))
            return parseInt(value.slice(2), 2);
        if (regex.test(value))
            return parseInt(value, 10);
        return -1;
    }
    removeComments(line) {
        const commentIndex = line.indexOf(';');
        return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    }
    splitInstruction(line) {
        const firstSpace = line.indexOf(' ');
        if (firstSpace < 0)
            return [line, undefined];
        return [
            line.slice(0, firstSpace),
            line.slice(firstSpace + 1).trim()
        ];
    }
}
