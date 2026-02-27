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
    console.log(`[1] Driving Layup: ${tendencies[1]}`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}`);
    console.log(`[15] Shot Tendency: ${tendencies[15]}`);
    console.log(`[18] Draw Foul: ${tendencies[18]}`);
    
    // Dump full 58
    console.log("Full: " + tendencies.join(', '));
}

// 0x2850EC in decimal = 2642156
let offset = buffer.indexOf(Buffer.from([0x50, 0x4C, 0x41, 0x59])); // "PLAY" marker? No.
// Let's just scan for CFIDs starting from 100000.
// We know LeBron is at 139378.
const RECORD_SIZE = 911;

let foundLebron = false, foundWade = false, foundAllen = false, foundCurry = false;

for(let i=100000; i<300000; i+=RECORD_SIZE) {
    // try to align
}
// Actually, LeBron is 139378. Modulo 911 -> 139378 % 911 = 910
let playerTableStart = 139378 % 911; // 0? No, 128448 % 911 = 907?
// 139378 - (12 * 911) = 128446
let start = 139378 - (800 * 911); // Safe start
while (start < 0) start += 911;

for (let i = start; i < buffer.length - RECORD_SIZE; i += RECORD_SIZE) {
    try {
        let CFID = buffer.readUInt16LE(i + 28);
        if (CFID === 1013 && !foundLebron) { dumpTendencies(i, "Lebron James"); foundLebron = true; }
        if (CFID === 1015 && !foundWade) { dumpTendencies(i, "Dwyane Wade"); foundWade = true; }
        if (CFID === 633 && !foundAllen) { dumpTendencies(i, "Ray Allen"); foundAllen = true; }
        if (CFID === 1611 && !foundCurry) { dumpTendencies(i, "Stephen Curry"); foundCurry = true; }
    } catch(e) {}
}

