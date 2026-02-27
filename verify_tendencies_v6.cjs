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
    
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Med-High for Allen)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Med for Allen)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Allen)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Allen)`);
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

function getPlayerName(base) {
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    let name = "";
    if (fnOffset > 0 && fnOffset < buffer.length - 50) {
        let i = fnOffset;
        while(buffer[i] !== 0 && i < fnOffset + 50) { name += String.fromCharCode(buffer[i++]); }
    }
    name += " ";
    if (lnOffset > 0 && lnOffset < buffer.length - 50) {
        let i = lnOffset;
        while(buffer[i] !== 0 && i < lnOffset + 50) { name += String.fromCharCode(buffer[i++]); }
    }
    return name.trim();
}

let foundWade = false;
let foundAllen = false;
let foundCurry = false;

// Scan the whole buffer out to 1.5MB (Players are usually front loaded)
for (let i = 0; i < 1500000; i++) {
    try {
        // Assume I is a record base. CFID must make sense (0 to 10000).
        let cfid = buffer.readUInt16LE(i + 28);
        if (cfid > 0 && cfid < 10000) {
            let name = getPlayerName(i);
            if (name === "Dwyane Wade" && !foundWade) {
                dumpTendencies(i, name);
                foundWade = true;
            } else if (name === "Ray Allen" && !foundAllen) {
                dumpTendencies(i, name);
                foundAllen = true;
            } else if (name === "Stephen Curry" && !foundCurry) {
                dumpTendencies(i, name);
                foundCurry = true;
            }
        }
        if (foundWade && foundAllen && foundCurry) break;
    } catch(e) {}
}

if (!foundWade) console.log("Did not find Wade");
if (!foundAllen) console.log("Did not find Allen");
if (!foundCurry) console.log("Did not find Curry");
