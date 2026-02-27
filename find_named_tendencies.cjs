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

const TENDENCY_NAMES = [
    "ShotTnd", "InsShot", "ClsShot", "MidShot", "Shot3PT", "DrvLane", "DrvRight", "PullUp", "PumpFake", 
    "TrplThrt", "NoTrplThrt", "TrplThrtSht", "Sizeup", "Hesttn", "StrtDrbl", "Cross", "Spin", "Stepback", 
    "Halfspin", "DblCross", "BhndBack", "HesCross", "InNOut", "SmplDrv", "Attack", "PassOut", "Hopstep", 
    "SpnLayup", "Eurostep", "Runner", "Fade", "Dunk", "Crash", "Touch", "UsePick", "SetPick", "Isltn", 
    "UseOffBScrn", "SetOffBScrn", "PostUp", "SpotUp", "PostSpin", "DropStep", "Shimmy", "FaceUp", "LeavePost", 
    "BackDown", "AggrBackDown", "PostShot", "PostHook", "PostFade", "PostDrv", "HopShot", "Putback", "FlashyPass", 
    "AlleyOop", "DrawFoul", "PlayPassLane", "TakeChrg", "OnBSteal", "Contest", "CommitFl", "HardFoul", "UseGlass", 
    "StpbckJmpr", "SpnJmpr", "StepThru", "ThrowAlleyOop", "GiveNGo"
]; // 69 items mapping Tendency.cs

const candidates = [];

// Try 7 bit and 8 bit
for (let bitSize of [7, 8]) {
    for (let byte = 420; byte <= 550; byte++) {
        for (let bit = 0; bit < 8; bit++) {
            const tendencies = [];
            let curByte = byte;
            let curBit = bit;
            
            for (let t = 0; t < 69; t++) { 
                const val = readBitsAt(playerStart, curByte, curBit, bitSize);
                tendencies.push(val);
                curBit += bitSize;
                while (curBit >= 8) { curBit -= 8; curByte++; }
            }
            
            let score = 0;
            if (tendencies[1] >= 80 && tendencies[1] <= 100) score += 2; // InsShot
            if (tendencies[2] >= 80 && tendencies[2] <= 100) score += 2; // ClsShot
            if (tendencies[4] >= 70 && tendencies[4] <= 90) score += 1;  // Shot3PT
            if (tendencies[31] >= 90 && tendencies[31] <= 100) score += 3; // Dunk
            if (tendencies[55] >= 50 && tendencies[55] <= 100) score += 1; // AlleyOop
            if (tendencies[56] >= 80 && tendencies[56] <= 100) score += 2; // DrawFoul
            
            const validCount = tendencies.filter(t => t <= 100).length;
            if (validCount >= 50) {
                score += 5;
                candidates.push({byte, bit, bitSize, score, validCount, tendencies});
            }
        }
    }
}

candidates.sort((a,b) => b.score - a.score);

for (let i = 0; i < Math.min(2, candidates.length); i++) {
    const c = candidates[i];
    console.log(`\n\n=== Score ${c.score} | Valid ${c.validCount}/69 | Offset: Byte ${c.byte}, Bit ${c.bit} | Size: ${c.bitSize}-bit ===`);
    let output = "";
    for(let j=0; j<69; j++) {
        output += `${TENDENCY_NAMES[j]}: ${c.tendencies[j]} | `;
        if((j+1)%7===0) output += '\n';
    }
    console.log(output);
}
