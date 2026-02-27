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

function getPlayerName(base) {
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    let name = "";
    if (fnOffset > 0 && fnOffset < buffer.length) {
        let i = fnOffset;
        while(buffer[i]!==0) { name += String.fromCharCode(buffer[i++]); }
    }
    name += " ";
    if (lnOffset > 0 && lnOffset < buffer.length) {
        let i = lnOffset;
        while(buffer[i]!==0) { name += String.fromCharCode(buffer[i++]); }
    }
    return name.trim();
}

// Just safely loop through every byte from 100,000 to 500,000 checking for valid string pointers
for (let i = 100000; i < 500000; i+= 911) {
    // Actually padding mismatches mean we can't assume 911 jumps globally across the entire file
    // So let's just do a 4-byte jump scan looking for valid names!
}

for (let i = 120000; i < 200000; i++) {
    try {
        // Assume I is a record base.
        const fnOffset = buffer.readUInt32LE(i + 52);
        if (fnOffset > 2500000 && fnOffset < 2800000) { // strings are stored late in the file
            let lnOffset = buffer.readUInt32LE(i + 56);
            if (lnOffset > 2500000 && lnOffset < 2800000) {
                let name = getPlayerName(i);
                if (name === "Dwyane Wade" || name === "Ray Allen" || name === "Stephen Curry") {
                    dumpTendencies(i, name);
                }
            }
        }
    } catch(e) {}
}
