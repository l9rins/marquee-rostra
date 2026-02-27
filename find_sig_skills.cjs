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

for (let byte = 350; byte <= 600; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const skills = [];
        let curByte = byte;
        let curBit = bit;
        
        for (let t = 0; t < 5; t++) { 
            const val = readBitsAt(playerStart, curByte, curBit, 6);
            skills.push(val);
            curBit += 6;
            while (curBit >= 8) { curBit -= 8; curByte++; }
        }
        
        let hasFinisher = skills.includes(30);
        let hasCoast = skills.includes(46);
        let hasHighlight = skills.includes(28);
        let hasDimer = skills.includes(36);
        let hasChasedown = skills.includes(40);
        
        let matchCount = (hasFinisher?1:0) + (hasCoast?1:0) + (hasHighlight?1:0) + (hasDimer?1:0) + (hasChasedown?1:0);
        
        if (matchCount >= 2) {
            candidates.push({byte, bit, skills, matchCount});
        }
    }
}

candidates.sort((a,b) => b.matchCount - a.matchCount);

for (let c of candidates) {
    console.log(`Match ${c.matchCount} -> Byte: ${c.byte}, Bit: ${c.bit} -> Skills: [${c.skills.join(', ')}]`);
}
