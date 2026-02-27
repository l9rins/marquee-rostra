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
    for (let byte = 400; byte <= 550; byte++) {
        for (let bit = 0; bit < 8; bit++) {
            const tendencies = [];
            let curByte = byte;
            let curBit = bit;
            
            for (let t = 0; t < 58; t++) { 
                const val = readBitsAt(playerStart, curByte, curBit, bitSize);
                tendencies.push(val);
                curBit += bitSize;
                while (curBit >= 8) { curBit -= 8; curByte++; }
            }
            
            let score = 0;
            // 1: Driving Layup (High > 85)
            // 3: Driving Dunk (High > 85)
            // 5: Alley Oop (High > 60)
            
            if (tendencies[1] >= 85 && tendencies[1] <= 100) score += 3;
            if (tendencies[3] >= 85 && tendencies[3] <= 100) score += 3;
            if (tendencies[5] >= 60 && tendencies[5] <= 100) score += 1;
            
            // LeBron also doesn't do a ton of standing dunks compared to driving
            if (tendencies[2] <= 50) score += 1;
            
            const validCount = tendencies.filter(t => t <= 100).length;
            
            if (score >= 4 && validCount >= 20) { 
                candidates.push({byte, bit, bitSize, score, validCount, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates using Unrestricted RED MC Array Order.`);
for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Valid: ${c.validCount}`);
    console.log(`  Values: [${c.tendencies.slice(0, 30).join(', ')} ...]`);
}
