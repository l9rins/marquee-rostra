const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

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

const TENDENCIES = [
    "Shot Tendency", "Inside Shots", "Close Shots", "Mid-Range Shots", "3-Point Shots", "Putbacks",
    "Drive Lane vs. Spot Up", "Pull Up vs. Penetrate", "Pump Fake", "Triple Threat", "Triple Threat Shot",
    "No 3-Threat Moves", "Straight Dribble", "SizeUp", "Hesitation", "Drive Right vs. Left", "Crossover",
    "Spin", "Step Back", "Half Spin", "Double Cross", "Behind The Back", "Hesitation Cross", "In And Out",
    "Simple Drive", "Attack The Basket", "Pass Out", "Fadeaways", "Stepback Jumper", "Spin Jumper",
    "Dunk vs. LayUp", "Alley-Oops", "Use Glass", "Draw Foul", "Crash", "Pick && Roll vs. Fade",
    "Post Up", "Touches", "Spin", "Drive", "Aggressive Backdown", "Leave Post", "Drop Step", "Face Up",
    "Back Down", "Post Shots", "Post Hook", "Post Fadeaway", "Shimmy Shot", "Hop Shot", "Flashy Passes",
    "Throw Alley-Oop", "Hard Foul", "Take Charge", "Play Pass Lane", "On-Ball Steal", "Contest Shot", "Commit Foul"
];

function dumpTendencies(base, name) {
    console.log(`\n--- ${name} (Offset: ${base}) ---`);
    let curByte = 442;
    let curBit = 7;
    for (let t = 0; t < 58; t++) { 
        let val = readBitsAt(base, curByte, curBit, 8);
        val = val & 127; // Mask MSB
        // Check only a few crucial identifiers
        if (t===0 || t===1 || t===4 || t===25 || t===30 || t===33 || t===36) {
            console.log(`[${t}] ${TENDENCIES[t]}: ${val}`);
        }
        curBit += 8;
        while (curBit >= 8) { curBit -= 8; curByte++; }
    }
}

// LeBron
dumpTendencies(139378, "LeBron James");

// Wade
dumpTendencies(1547907, "Dwyane Wade");

// Curry
dumpTendencies(1041640, "Stephen Curry"); // Curry one of the offsets found earlier
dumpTendencies(1038770, "Stephen Curry (alt)"); 

// Ray Allen
dumpTendencies(1229299, "Ray Allen"); // Ray Allen offset found earlier
