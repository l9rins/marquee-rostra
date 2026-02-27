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
            let isValid = true;
            
            for (let t = 0; t < 69; t++) { // Tendency.cs had 69 items originally!
                const val = readBitsAt(playerStart, curByte, curBit, bitSize);
                if (val > 105 && val !== 255) { 
                    isValid = false;
                    break;
                }
                tendencies.push(val);
                curBit += bitSize;
                while (curBit >= 8) {
                    curBit -= 8;
                    curByte++;
                }
            }
            
            if (!isValid) continue;

            let score = 0;
            // Tendency.cs order:
            // 1: InsShot (High)
            // 2: ClsShot (High)
            // 4: Shot3PT (Med-High)
            // 31: Dunk (High for LeBron)
            // 55: AlleyOop (Med-High)
            // 56: DrawFoul (High)
            
            if (tendencies[1] >= 80) score += 2;
            if (tendencies[2] >= 80) score += 2;
            if (tendencies[4] >= 70 && tendencies[4] <= 90) score += 1;
            if (tendencies[31] >= 90) score += 3;
            if (tendencies[55] >= 50) score += 1;
            if (tendencies[56] >= 90) score += 2;
            
            // Check for multiple high values typical for LeBron
            const highCount = tendencies.filter(t => t >= 80 && t <= 100).length;
            score += Math.min(highCount, 10);

            if (score >= 12) {
                candidates.push({byte, bit, bitSize, score, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates. Top matches:`);
for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Size: ${c.bitSize}`);
    console.log(`  Values: [${c.tendencies.slice(0, 35).join(', ')} ...]`);
}
