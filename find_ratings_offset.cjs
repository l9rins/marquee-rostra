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

for (let byte = 0; byte <= RECORD_SIZE - 43; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const ratings = [];
        let curByte = byte;
        let curBit = bit;
        let isValid = true;
        
        for (let t = 0; t < 43; t++) {
            const raw = readBitsAt(playerStart, curByte, curBit, 8);
            const r = Math.floor(raw / 3) + 25;
            if (r < 25 || r > 115) { // ratings should be between 25 and 110
                isValid = false;
                break;
            }
            ratings.push(r);
            curByte++;
        }
        
        if (!isValid) continue;

        let score = 0;
        // In 2K14, LeBron is a 99 OVR. Dunk is 99.
        // We look for multiple 99s, and high numbers.
        const r99Count = ratings.filter(r => r === 99 || r === 98).length;
        if (r99Count >= 3) score += r99Count;
        
        // Block, Steal, 3pt should be intermediate (70-85 type)
        const midCount = ratings.filter(r => r >= 70 && r <= 85).length;
        if (midCount >= 5) score += midCount;
        
        if (score >= 10) {
            candidates.push({byte, bit, score, ratings});
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} rating block candidates. Top matches:`);
for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}`);
    console.log(`Ratings: [${c.ratings.slice(0, 20).join(', ')} ...]`);
}
