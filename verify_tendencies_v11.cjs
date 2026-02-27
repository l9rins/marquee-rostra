const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);
const RECORD_SIZE = 911;
const anchor = 139378;

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
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

function getPlayerName(base) {
    if (base + 60 > buffer.length) return "";
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    let name = "";
    if (fnOffset > 0 && fnOffset < buffer.length - 100) {
        let i = fnOffset;
        while(buffer[i] && i < fnOffset + 30) { name += String.fromCharCode(buffer[i++]); }
    }
    name += " ";
    if (lnOffset > 0 && lnOffset < buffer.length - 100) {
        let i = lnOffset;
        while(buffer[i] && i < lnOffset + 30) { name += String.fromCharCode(buffer[i++]); }
    }
    return name.trim();
}

console.log("Extracting block-aligned records relative to LeBron...");

let foundCount = 0;

for (let n = -1000; n < 1000; n++) {
    let offset = anchor + n * RECORD_SIZE;
    if (offset < 0 || offset + RECORD_SIZE > buffer.length) continue;

    let cfid = buffer.readUInt16LE(offset + 28);
    // Ignore all but superstars
    if (cfid === 1015 || cfid === 633 || cfid === 1611 || cfid === 1013) {
        let name = getPlayerName(offset);
        // Fallback names if name pointer is broken but CFID matches perfectly in-block
        if (!name || name.trim() === "") {
            if (cfid === 1013) name = "LeBron James (?)";
            if (cfid === 1015) name = "Dwyane Wade (?)";
            if (cfid === 633) name = "Ray Allen (?)";
            if (cfid === 1611) name = "Stephen Curry (?)";
        }
        dumpTendencies(offset, name);
        foundCount++;
    }
}
console.log(`Extraction complete. Found ${foundCount} perfectly aligned targets.`);
