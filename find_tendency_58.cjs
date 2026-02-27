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
    for (let byte = 420; byte <= 550; byte++) {
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
            // Assuming RED MC Category Order for Tendency since they dropped 11.
            // 0: Stepback 3PT
            // 1: Driving Layup (High)
            // 2: Standing Dunk 
            // 3: Driving Dunk (High)
            // 4: Flashy Dunk
            // 5: Alley Oop
            
            if (tendencies[1] >= 85 && tendencies[1] <= 100) score += 3;
            if (tendencies[3] >= 85 && tendencies[3] <= 100) score += 3;
            if (tendencies[5] >= 50 && tendencies[5] <= 100) score += 1;
            
            const highCount = tendencies.filter(t => t >= 80 && t <= 105).length;
            const validCount = tendencies.filter(t => t <= 100 || t === 127 || t === 255).length;
            
            if (validCount >= 45) { // Tolerate some outliers
                score += Math.min(highCount, 8);
                candidates.push({byte, bit, bitSize, score, validCount, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} candidates.`);
for (let i = 0; i < Math.min(4, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Size: ${c.bitSize}-bit, Valid: ${c.validCount}`);
    console.log(`  Values: [${c.tendencies.slice(0, 30).join(', ')} ...]`);
}
