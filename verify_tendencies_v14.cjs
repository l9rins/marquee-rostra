const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

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

function dumpTendencies(base, name) {
    console.log(`\n--- ${name} (Offset: ${base}) ---`);
    const tendencies = [];
    let curByte = 479;
    let curBit = 6;
    for (let t = 0; t < 58; t++) { 
        let val = readBitsAt(base, curByte, curBit, 8);
        val = val & 127; // Mask MSB
        tendencies.push(val);
        curBit += 8;
        while (curBit >= 8) { curBit -= 8; curByte++; }
    }
    
    console.log(`[1] Driving Layup: ${tendencies[1]}`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}`);
    console.log(`[15] Shot Tendency: ${tendencies[15]}`);
    console.log(`[18] Draw Foul: ${tendencies[18]}`);
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

let wadeMod = 1547907 % 911; // 96
console.log("Scanning exclusively for records aligned to Wade's modulo: " + wadeMod);

let count = 0;
for (let i = 0; i < buffer.length - 1000; i++) {
    if (i % 911 === wadeMod) {
        let cfid = buffer.readUInt16LE(i + 28);
        if (cfid === 1015) { dumpTendencies(i, "Dwyane Wade (1015)"); count++; }
        if (cfid === 633) { dumpTendencies(i, "Ray Allen (633)"); count++; }
        if (cfid === 1611) { dumpTendencies(i, "Stephen Curry (1611)"); count++; }
        if (cfid === 1013) { dumpTendencies(i, "LeBron James (1013)"); count++; }
        if (cfid === 1014) { dumpTendencies(i, "Chris Bosh (1014)"); count++; }
    }
}

console.log(`Total stars found on this exact modulo block alignment: ${count}`);
