const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const playerStart = 139378; // LeBron

function readBitsAt(absBase, byteOff, bitOff, count) {
    let pos = absBase + byteOff;
    let bitPos = bitOff;
    let result = 0;
    for (let i = 0; i < count; i++) {
        const bit = (buffer[pos] >> (7 - bitPos)) & 1;
        result = (result << 1) | bit;
        bitPos++;
        if (bitPos >= 8) { bitPos = 0; pos++; }
    }
    return result;
}

const tendencies = [];
let curByte = 444;
let curBit = 6;

for (let t = 0; t < 69; t++) { 
    tendencies.push(readBitsAt(playerStart, curByte, curBit, 8));
    curBit += 8;
    while (curBit >= 8) {
        curBit -= 8;
        curByte++;
    }
}

console.log(`Values extracted starting at Byte 444, Bit 6 (8-bit width):`);
console.log(tendencies.join(', '));
