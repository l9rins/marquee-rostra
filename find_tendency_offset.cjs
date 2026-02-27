const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const LEBRON_CFID = 1013;
const RECORD_SIZE = 911;

let playerStart = -1;
for (let i = 0; i < buffer.length - RECORD_SIZE; i += 4) {
    if (buffer[i + 28] === (LEBRON_CFID & 0xFF) && buffer[i + 29] === ((LEBRON_CFID >> 8) & 0xFF)) {
        playerStart = i;
        break;
    }
}

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

const candidates = [];

for (let byte = 0; byte <= RECORD_SIZE - 58; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const tendencies = [];
        let curByte = byte;
        let curBit = bit;
        let isValid = true;
        
        for (let t = 0; t < 58; t++) {
            const val = readBitsAt(playerStart, curByte, curBit, 8);
            if (val > 105 && val !== 255) { 
                // Allow 255 to mean 'Unused' or max, though normally capped at 100.
                isValid = false;
                break;
            }
            tendencies.push(val);
            curByte++;
        }
        
        if (!isValid) continue;

        let score = 0;
        // LeBron expectations (0-100 scale):
        if (tendencies[1] >= 90) score += 2;    // Driving Layup 
        if (tendencies[3] >= 90) score += 2;    // Driving Dunk 
        if (tendencies[4] >= 60) score += 1;    // Flashy Dunk
        if (tendencies[5] >= 60) score += 1;    // Alley Oop
        if (tendencies[56] >= 90) score += 2;   // Shot Under Basket
        if (tendencies[57] >= 90) score += 2;   // Close Shot
        if (tendencies[0] <= 50) score += 1;    // Stepback 3PT 
        
        if (score >= 6) {
            candidates.push({byte, bit, score, tendencies});
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates. Top matches:`);
for (let i = 0; i < Math.min(10, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}`);
    console.log(`0(Stepbck): ${c.tendencies[0]}, 1(Layup): ${c.tendencies[1]}, 3(DrvDunk): ${c.tendencies[3]}, 4(FlshDnk): ${c.tendencies[4]}, 5(Oop): ${c.tendencies[5]}, 56(UndrBs): ${c.tendencies[56]}, 57(Close): ${c.tendencies[57]}`);
}
