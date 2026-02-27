const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const base = 139378; // LeBron

function readBitsAt(byteOff, bitOff, count) {
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

let bestScore = 0;

for (let byte = 0; byte < 800; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        
        let tendencies = [];
        let curByte = byte;
        let curBit = bit;
        for (let t = 0; t < 58; t++) { 
            let val = readBitsAt(curByte, curBit, 8);
            val = val & 127; // Mask MSB
            if (val > 100 && val !== 127) {
                // Tendencies rarely exceed 100 except for flag limits, so penalize
                tendencies.push(val);
            } else {
                tendencies.push(val);
            }
            curBit += 8;
            while (curBit >= 8) { curBit -= 8; curByte++; }
        }
        
        // LeBron James Heuristics based on RED MC 2K14 Schema
        // 0: Shot Tendency (LeBron shoots a lot -> 80+)
        // 1: Inside Shots (High -> 70+)
        // 4: 3-Point Shots (Mid/High -> 50-85)
        // 25: Attack The Basket (Very High -> 80+)
        // 30: Dunk vs. LayUp (Should be decent, 30+)
        // 31: Alley-Oops (Decent -> 20+)
        // 33: Draw Foul (Extremely High -> 85+)
        // 36: Post Up (High -> 60+)
        // 50: Flashy Passes (Mid -> 30+)
        // 55: On-Ball Steal (Mid -> 40+)
        
        let score = 0;
        if (tendencies[0] >= 80 && tendencies[0] <= 99) score += 2;
        if (tendencies[1] >= 70 && tendencies[1] <= 99) score += 1;
        if (tendencies[4] >= 50 && tendencies[4] <= 85) score += 1;
        if (tendencies[25] >= 80 && tendencies[25] <= 99) score += 2;
        if (tendencies[33] >= 80 && tendencies[33] <= 99) score += 3; // Draw foul is huge for LBJ
        if (tendencies[36] >= 50 && tendencies[36] <= 95) score += 1;
        if (tendencies[55] >= 30 && tendencies[55] <= 80) score += 1;
        
        // Check for 0s or wildly impossible values
        let invalid = 0;
        for (let v of tendencies) {
            if (v > 100 && v !== 127) invalid++;
        }
        score -= (invalid * 2);
        
        if (score >= 6) {
            console.log(`\nPotential Match at Byte: ${byte}, Bit: ${bit} | Score: ${score}`);
            console.log(`[0] Shot Tendency: ${tendencies[0]}`);
            console.log(`[1] Inside Shots: ${tendencies[1]}`);
            console.log(`[4] 3PT Shots: ${tendencies[4]}`);
            console.log(`[25] Attack Basket: ${tendencies[25]}`);
            console.log(`[30] Dunk vs Layup: ${tendencies[30]}`);
            console.log(`[33] Draw Foul: ${tendencies[33]}`);
            console.log(`[36] Post Up: ${tendencies[36]}`);
            bestScore = score;
        }
    }
}
