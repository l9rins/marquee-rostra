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
    
    // Key tendencies that should look right
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Med-High for Allen, Med for Curry)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Med for Allen, Low for Curry)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Allen, Low for Curry)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Allen, Max for Curry)`);
    
    // Dump full 58
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

let foundWade = false, foundAllen = false, foundCurry = false;

// Scan entire buffer
for (let i = 0; i < buffer.length - 1000; i++) {
    let cfid = buffer.readUInt16LE(i + 28);
    let position = buffer[i + 60];
    
    if (cfid === 1015 && position === 1 && !foundWade) {
        dumpTendencies(i, "Dwyane Wade");
        foundWade = true;
    }
    if (cfid === 633 && position === 1 && !foundAllen) {
        dumpTendencies(i, "Ray Allen");
        foundAllen = true;
    }
    if (cfid === 1611 && position === 0 && !foundCurry) {
        dumpTendencies(i, "Stephen Curry");
        foundCurry = true;
    }
    if (foundWade && foundAllen && foundCurry) break;
}

if (!foundWade) console.log("Wade not found.");
if (!foundAllen) console.log("Ray Allen not found.");
if (!foundCurry) console.log("Curry not found.");
