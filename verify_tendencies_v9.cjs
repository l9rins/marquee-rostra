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
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

let found = false;

for (let i = 0; i < buffer.length - 1000; i++) {
    let cfid = buffer.readUInt16LE(i + 28);
    // Wade=1015, Allen=633, Curry=1611. Also check Bosh=1014 just in case.
    if (cfid === 1015 || cfid === 633 || cfid === 1611 || cfid === 1014) {
        console.log(`Found CFID ${cfid} at ${i}`);
        dumpTendencies(i, `Player ${cfid}`);
        found = true;
    }
}

if (!found) console.log("Did not find CFIDs 1015, 633, 1611, 1014");
