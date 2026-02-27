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

for (let bitSize of [7, 8]) {
    for (let byte = 400; byte <= 550; byte++) {
        for (let bit = 0; bit < 8; bit++) {
            const tendencies = [];
            let curByte = byte;
            let curBit = bit;
            let isValid = true;
            
            for (let t = 0; t < 58; t++) { 
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
            // Assuming RED MC order matches Binary order:
            // 1: Driving Layup (High)
            // 3: Driving Dunk (High)
            // 4: Flashy Dunk (Med)
            // 5: Alley-Oop (High)
            // 56: Use Glass (Med-High)
            
            if (tendencies[1] >= 80) score += 2;
            if (tendencies[3] >= 80) score += 3;
            if (tendencies[4] >= 40) score += 1;
            if (tendencies[5] >= 60) score += 1;
            
            const highCount = tendencies.filter(t => t >= 80 && t <= 100).length;
            score += Math.min(highCount, 10);

            if (score >= 12) {
                candidates.push({byte, bit, bitSize, score, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates using RED MC Array Order.`);
for (let i = 0; i < Math.min(3, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Size: ${c.bitSize}`);
    console.log(`  Values: [${c.tendencies.slice(0, 30).join(', ')} ...]`);
}
