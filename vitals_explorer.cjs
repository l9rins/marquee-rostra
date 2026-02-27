const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const CFID_OFFSET = 28;
const BLOCK_SIZE = 911;

const CFID_LEBRON = 1013;
const CFID_KD = 1147;
const CFID_KOBE = 195;

function findLeBron() {
    const name = "James";
    const bufName = Buffer.from(name);
    for (let i = 0; i < buffer.length - BLOCK_SIZE; i++) {
        // Name usually starts at offset 12 (Last Name) or 0 (First Name)
        // Let's search for "James" at offset 12 and CFID at 28
        if (buffer.slice(i + 12, i + 12 + name.length).equals(bufName) &&
            buffer.readUInt16LE(i + CFID_OFFSET) === CFID_LEBRON) {
            return i;
        }
    }
    return -1;
}

function findKobe() {
    const name = "Bryant";
    const bufName = Buffer.from(name);
    for (let i = 0; i < buffer.length - BLOCK_SIZE; i++) {
        if (buffer.slice(i + 12, i + 12 + name.length).equals(bufName) &&
            buffer.readUInt16LE(i + CFID_OFFSET) === CFID_KOBE) {
            return i;
        }
    }
    return -1;
}

const lebronIdx = findLeBron();
const kobeIdx = findKobe();
const kdIdx = -1; // Skip KD for now

console.log(`LeBron: ${lebronIdx}`);
console.log(`Kobe: ${kobeIdx}`);
console.log(`KD: ${kdIdx}`);

function dumpRecord(idx, name) {
    if (idx === -1) return;
    console.log(`\n--- ${name} (128 bytes) ---`);
    for (let i = 0; i < 128; i += 16) {
        let line = `${i.toString().padStart(3, ' ')} [0x${i.toString(16).padStart(2, '0')}]: `;
        for (let j = 0; j < 16; j++) {
            line += buffer[idx + i + j].toString(16).padStart(2, '0') + ' ';
        }
        console.log(line);
    }
}

dumpRecord(lebronIdx, "LeBron");
dumpRecord(kobeIdx, "Kobe");

function checkByte(idx, name, offset, expectedValue) {
    if (idx === -1) return;
    const val = buffer[idx + offset];
    console.log(`[${name}] Offset ${offset}: ${val} (Expected ${expectedValue})`);
}

// LeBron: Weight 250 (150), BDay 30, BMonth 12
checkByte(lebronIdx, "LeBron", 30, 150);
checkByte(lebronIdx, "LeBron", 31, 30);
checkByte(lebronIdx, "LeBron", 32, 12);

// Kobe: Weight 205 (105), BDay 23, BMonth 8
checkByte(kobeIdx, "Kobe", 30, 105);
checkByte(kobeIdx, "Kobe", 31, 23);
checkByte(kobeIdx, "Kobe", 32, 8);
