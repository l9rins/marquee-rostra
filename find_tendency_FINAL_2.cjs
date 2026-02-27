const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function readBitsAt(base, byteOff, bitOff, count) {
    let pos = base + byteOff;
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

const stars = [
    { name: "LeBron James", offset: 139378 },     // Proved
    { name: "Stephen Curry", offset: 1038770 },   // Proved
    { name: "Dwyane Wade", offset: 1189486 },     // Wait, 1189486 wasn't 92 OVR. Let me rescan just Wade...
];

const trueWadeOffset = 1547907; // 42 OVR... Actually wait let me test LeBron first, LeBron is the absolute benchmark.

let base = 139378;

for (let byte = 0; byte < 800; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        let curByte = byte;
        let curBit = bit;
        
        let tendencies = [];
        let invalid = 0;
        
        for (let t = 0; t < 58; t++) { 
            let val = readBitsAt(base, curByte, curBit, 8);
            val = val & 127; // Mask MSB
            if (val > 100 && val !== 127) invalid++;
            tendencies.push(val);
            
            curBit += 8;
            while (curBit >= 8) { curBit -= 8; curByte++; }
        }
        
        // Exact schema checks for LeBron James (99 OVR Benchmark)
        // [0] Shot Tendency -> 80+
        // [1] Inside Shots -> 70+
        // [4] 3PT Shots -> 65-85
        // [25] Attack The Basket -> 85+
        // [30] Dunk vs Layup -> 30+
        // [33] Draw Foul -> 85+
        // [36] Post Up -> 60-95
        // [55] On-Ball Steal -> 40+
        
        let score = 0;
        if (tendencies[0] >= 80 && tendencies[0] <= 100) score += 2;
        if (tendencies[1] >= 70 && tendencies[1] <= 100) score += 1;
        if (tendencies[4] >= 65 && tendencies[4] <= 90) score += 1;
        if (tendencies[25] >= 85 && tendencies[25] <= 100) score += 2;
        if (tendencies[30] >= 30 && tendencies[30] <= 90) score += 1;
        if (tendencies[33] >= 85 && tendencies[33] <= 100) score += 3;
        if (tendencies[36] >= 60 && tendencies[36] <= 95) score += 1;
        if (tendencies[55] >= 40 && tendencies[55] <= 80) score += 1;
        
        score -= (invalid * 3);
        
        if (score >= 8) {
            console.log(`\n!!! TRUE SCHEMA MATCH AT BYTE ${byte}, BIT ${bit} !!! (Score: ${score})`);
            console.log(`[0] Shot Tendency: ${tendencies[0]}`);
            console.log(`[1] Inside Shots: ${tendencies[1]}`);
            console.log(`[4] 3PT Shots: ${tendencies[4]}`);
            console.log(`[25] Attack Basket: ${tendencies[25]}`);
            console.log(`[30] Dunk vs Layup: ${tendencies[30]}`);
            console.log(`[33] Draw Foul: ${tendencies[33]}`);
            console.log(`[36] Post Up: ${tendencies[36]}`);
            console.log(`[55] On-Ball Steal: ${tendencies[55]}`);
        }
    }
}
