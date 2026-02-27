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
    for (let byte = 400; byte <= 600; byte++) {
        for (let bit = 0; bit < 8; bit++) {
            const tendencies = [];
            let curByte = byte;
            let curBit = bit;
            let isValid = true;
            
            for (let t = 0; t < 58; t++) {
                const val = readBitsAt(playerStart, curByte, curBit, bitSize);
                if (val > 105 && val !== 255 && val !== 127) { 
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
            // 1: Layup (High), 3: DrvDunk (High), 56: UnderBasket (High), 57: CloseShot (High)
            // 0: Stepback (Low/Med), 5: Oop (Med/High)
            if (tendencies[1] >= 85) score += 2;
            if (tendencies[3] >= 85) score += 2;
            if (tendencies[56] >= 85) score += 2;
            if (tendencies[57] >= 85) score += 2;
            
            // Check for multiple high values typical for LeBron
            const highCount = tendencies.filter(t => t >= 80 && t <= 100).length;
            score += highCount;

            // Only highly plausible ones
            if (score >= 10) {
                candidates.push({byte, bit, bitSize, score, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates. Top matches:`);
for (let i = 0; i < Math.min(10, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Size: ${c.bitSize}`);
    console.log(`  Values: ${c.tendencies.slice(0, 15).join(', ')} ...`);
}
