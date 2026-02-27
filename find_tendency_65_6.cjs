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
];

const tendencies = [];
let curByte = 65;
let curBit = 6;

for (let t = 0; t < 69; t++) { 
    tendencies.push(readBitsAt(playerStart, curByte, curBit, 8));
    curBit += 8;
    while (curBit >= 8) { curBit -= 8; curByte++; }
}

console.log(`=== Exact 8-bit read at Byte 65, Bit 6 ===`);
let output = "";
for(let j=0; j<69; j++) {
    output += `${TENDENCY_NAMES[j]}: ${tendencies[j]} | `;
    if((j+1)%5===0) output += '\n';
}
console.log(output);
