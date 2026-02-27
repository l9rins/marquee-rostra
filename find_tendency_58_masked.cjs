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

for (let byte = 50; byte <= 550; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const tendencies = [];
        let curByte = byte;
        let curBit = bit;
        let isValid = true;
        
        for (let t = 0; t < 58; t++) { 
            let val = readBitsAt(playerStart, curByte, curBit, 8);
            val = val & 127; // Mask MSB
            
            if (val > 105) { 
                isValid = false;
                break;
            }
            tendencies.push(val);
            
            curBit += 8;
            while (curBit >= 8) { curBit -= 8; curByte++; }
        }
        
        if (!isValid) continue;

        let score = 0;
        // RED MC Order
        // 1: Driving Layup (High)
        // 3: Driving Dunk (High)
        // 5: Alley Oop (High/Med)
        // 17: Drive Right (Highish)
        
        if (tendencies[1] >= 85 && tendencies[1] <= 100) score += 3;
        if (tendencies[3] >= 85 && tendencies[3] <= 100) score += 4;
        if (tendencies[5] >= 50 && tendencies[5] <= 100) score += 1;
        if (tendencies[17] >= 60 && tendencies[17] <= 100) score += 1;
        
        const validCount = tendencies.filter(t => t <= 100).length;
        if (validCount >= 40 && score >= 5) {
            candidates.push({byte, bit, score, validCount, tendencies});
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

console.log(`Found ${candidates.length} MSB-Masked candidates using RED MC Array Order.`);
for (let i = 0; i < Math.min(3, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\nScore ${c.score} -> Byte: ${c.byte}, Bit: ${c.bit}, Valid: ${c.validCount}`);
    console.log(`  Values: [${c.tendencies.slice(0, 30).join(', ')} ...]`);
}
