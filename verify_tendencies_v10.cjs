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
    
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Max for Curry)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Low for Curry)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Curry)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Curry)`);
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

function getPlayerName(base) {
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    let name = "";
    if (fnOffset > 0 && fnOffset < buffer.length - 100) {
        let i = fnOffset;
        while(buffer[i]) { name += String.fromCharCode(buffer[i++]); }
    }
    name += " ";
    if (lnOffset > 0 && lnOffset < buffer.length - 100) {
        let i = lnOffset;
        while(buffer[i]) { name += String.fromCharCode(buffer[i++]); }
    }
    return name.trim();
}

// Trace backwards
console.log("Scanning BACKWARDS from LeBron...");
let b = anchor;
while (b >= 0) {
    let cfid = buffer.readUInt16LE(b + 28);
    if (cfid === 0 || cfid > 15000) break; // Invalid record likely limits the array
    
    // Check if it's Wade, Allen, or Curry
    if (cfid === 1015) dumpTendencies(b, "Dwyane Wade " + getPlayerName(b));
    if (cfid === 633) dumpTendencies(b, "Ray Allen " + getPlayerName(b));
    if (cfid === 1611) dumpTendencies(b, "Stephen Curry " + getPlayerName(b));
    
    b -= RECORD_SIZE;
}
console.log(`Block reaches down to: ${b + RECORD_SIZE}`);

// Trace forwards
console.log("\nScanning FORWARDS from LeBron...");
let f = anchor;
while (f + RECORD_SIZE < buffer.length) {
    let cfid = buffer.readUInt16LE(f + 28);
    if (cfid === 0 || cfid > 15000) break;
    
    if (cfid === 1015) dumpTendencies(f, "Dwyane Wade " + getPlayerName(f));
    if (cfid === 633) dumpTendencies(f, "Ray Allen " + getPlayerName(f));
    if (cfid === 1611) dumpTendencies(f, "Stephen Curry " + getPlayerName(f));
    
    f += RECORD_SIZE;
}
console.log(`Block reaches up to: ${f - RECORD_SIZE}`);

