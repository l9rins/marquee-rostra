const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);
const DEFAULT_RECORD_SIZE = 911;

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
    
    // Key tendencies that should look right
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Med-High for Allen, Med for Curry)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Med for Allen, Low for Curry)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Allen, Low for Curry)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Allen, Max for Curry)`);
    
    // Dump full 58
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

let playerTableOffset = 0;
let found = false;

// Scan forward from the beginning of the buffer
for (let offset = 0; offset < buffer.length - DEFAULT_RECORD_SIZE * 3; offset += 4) {
    const cfidOff1 = offset + 28;
    const cfidOff2 = offset + DEFAULT_RECORD_SIZE + 28;
    const cfidOff3 = offset + (DEFAULT_RECORD_SIZE * 2) + 28;

    if (cfidOff3 + 1 >= buffer.length) break;

    const cfid1 = buffer.readUInt16LE(cfidOff1);
    const cfid2 = buffer.readUInt16LE(cfidOff2);
    const cfid3 = buffer.readUInt16LE(cfidOff3);

    if ((cfid1 === 0 || (cfid1 > 0 && cfid1 < 10000)) &&
        (cfid2 > 0 && cfid2 < 10000) &&
        (cfid3 > 0 && cfid3 < 10000)) {
        playerTableOffset = offset;
        found = true;
        break;
    }
}

if (!found) {
    console.log("Player table not found!");
    process.exit(1);
}

console.log("Player Table Found At: " + playerTableOffset);

for (let offset = playerTableOffset; offset + DEFAULT_RECORD_SIZE <= buffer.length; offset += DEFAULT_RECORD_SIZE) {
    const cfid = buffer.readUInt16LE(offset + 28);
    if (cfid === 1013) dumpTendencies(offset, "LeBron James");
    if (cfid === 1015) dumpTendencies(offset, "Dwyane Wade");
    if (cfid === 633) dumpTendencies(offset, "Ray Allen");
    if (cfid === 1611) dumpTendencies(offset, "Stephen Curry");
}
