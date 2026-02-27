const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);
const RECORD_SIZE = 911;

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
    
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Med-High for Allen)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Med for Allen)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Allen)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Allen)`);
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

let anchor = 139378; // LeBron

// Scan forwards
for (let i = anchor; i < buffer.length - RECORD_SIZE; i += RECORD_SIZE) {
    let cfid = buffer.readUInt16LE(i + 28);
    if (cfid === 1013) dumpTendencies(i, "LeBron James");
    if (cfid === 1015) dumpTendencies(i, "Dwyane Wade");
    if (cfid === 633) dumpTendencies(i, "Ray Allen");
    if (cfid === 1611) dumpTendencies(i, "Stephen Curry");
}

// Scan backwards
for (let i = anchor - RECORD_SIZE; i > 0; i -= RECORD_SIZE) {
    let cfid = buffer.readUInt16LE(i + 28);
    if (cfid === 1015) dumpTendencies(i, "Dwyane Wade");
    if (cfid === 633) dumpTendencies(i, "Ray Allen");
    if (cfid === 1611) dumpTendencies(i, "Stephen Curry");
}
