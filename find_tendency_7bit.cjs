const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const playerStart = 139378; // LeBron

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

for (let byte = 400; byte <= 600; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const tendencies = [];
        let curByte = byte;
        let curBit = bit;
        
        for (let t = 0; t < 69; t++) { 
            const val = readBitsAt(playerStart, curByte, curBit, 7); // 7-Bit extraction
            tendencies.push(val);
            curBit += 7;
            while (curBit >= 8) {
                curBit -= 8;
                curByte++;
            }
        }
        
        let score = 0;
        
        // Expected LeBron profile (Tendency.cs order):
        // 1: InsShot (High)
        // 2: ClsShot (High)
        // 4: Shot3PT (Med-High, ~78)
        // 31: Dunk (High, 99)
        // 55: AlleyOop (High)
        // 56: DrawFoul (High)
        
        if (tendencies[1] >= 80 && tendencies[1] <= 100) score += 2;
        if (tendencies[2] >= 80 && tendencies[2] <= 100) score += 2;
        if (tendencies[4] >= 70 && tendencies[4] <= 90) score += 1;
        if (tendencies[31] >= 90 && tendencies[31] <= 100) score += 4;
        if (tendencies[55] >= 50 && tendencies[55] <= 100) score += 1;
        if (tendencies[56] >= 80 && tendencies[56] <= 100) score += 2;
        
        const validCount = tendencies.filter(t => t <= 100 || t === 127).length;
        
        if (validCount >= 50) {
            score += 5;
            candidates.push({byte, bit, score, validCount, tendencies});
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates.`);
for (let i = 0; i < Math.min(3, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Valid: ${c.validCount}`);
    console.log(`  Values: [${c.tendencies.slice(0, 32).join(', ')} ...]`);
}
