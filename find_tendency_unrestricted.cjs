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

for (let bitSize of [8]) {
    for (let byte = 400; byte <= 600; byte++) {
        for (let bit = 0; bit < 8; bit++) {
            const tendencies = [];
            let curByte = byte;
            let curBit = bit;
            
            for (let t = 0; t < 69; t++) { 
                const val = readBitsAt(playerStart, curByte, curBit, bitSize);
                tendencies.push(val);
                curBit += bitSize;
                while (curBit >= 8) {
                    curBit -= 8;
                    curByte++;
                }
            }
            
            let score = 0;
            
            // Expected LeBron profile:
            if (tendencies[1] >= 80 && tendencies[1] <= 100) score += 2; // InsShot
            if (tendencies[2] >= 80 && tendencies[2] <= 100) score += 2; // ClsShot
            if (tendencies[4] >= 70 && tendencies[4] <= 90) score += 1;  // Shot3PT
            if (tendencies[31] >= 90 && tendencies[31] <= 100) score += 4; // Dunk
            if (tendencies[55] >= 50 && tendencies[55] <= 100) score += 1; // AlleyOop
            if (tendencies[56] >= 80 && tendencies[56] <= 100) score += 2; // DrawFoul
            if (tendencies[24] >= 80 && tendencies[24] <= 100) score += 1; // Attack
            
            // Max value check. 0 to 127 is more acceptable than 200+ for tendencies
            const highCount = tendencies.filter(t => t >= 80 && t <= 105).length;
            const validCount = tendencies.filter(t => t <= 105 || t === 255).length;
            
            if (validCount >= 40) {
                score += Math.min(highCount, 5);
            } else {
                score -= 10; // Penalize garbage blocks
            }

            if (score >= 8) {
                candidates.push({byte, bit, score, validCount, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates. Top matches:`);
for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Valid: ${c.validCount}`);
    console.log(`  Values: [${c.tendencies.slice(0, 32).join(', ')} ...]`);
}
