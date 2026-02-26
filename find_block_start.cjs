const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 139406; // LeBron CFID 1013 -> F5 03

// If block size is 911, let's find the start.
// Usually the start of a player record has some predictable bytes, or maybe the CFID is still at offset 28?
// If CFID is at offset 28, then the block starts at 139406 - 28 = 139378.
const blockStartGuess = target - 28;

console.log(`Dumping the first 64 bytes of the LeBron block assuming CFID offset is 28:`);
const end = Math.min(buffer.length, blockStartGuess + 64);
for (let i = blockStartGuess; i < end; i += 16) {
    let line = `${i.toString(16).padStart(8, '0')}  `;
    for (let j = 0; j < 16; j++) {
        if (i + j < end) {
            line += buffer[i + j].toString(16).padStart(2, '0') + ' ';
        } else {
            line += '   ';
        }
    }
    line += ' |';
    for (let j = 0; j < 16; j++) {
        if (i + j < end) {
            const charCode = buffer[i + j];
            line += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        }
    }
    line += '|';
    console.log(line);
}

// Check other players assuming CFID is at 28
// Next player would be at blockStartGuess + 911
const nextBlockStart = blockStartGuess + 911;
console.log(`\nChecking next block at ${nextBlockStart} (0x${nextBlockStart.toString(16)}):`);
const nextEnd = Math.min(buffer.length, nextBlockStart + 64);
for (let i = nextBlockStart; i < nextEnd; i += 16) {
    let line = `${i.toString(16).padStart(8, '0')}  `;
    for (let j = 0; j < 16; j++) {
        if (i + j < nextEnd) {
            line += buffer[i + j].toString(16).padStart(2, '0') + ' ';
        } else {
            line += '   ';
        }
    }
    line += ' |';
    for (let j = 0; j < 16; j++) {
        if (i + j < nextEnd) {
            const charCode = buffer[i + j];
            line += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        }
    }
    line += '|';
    console.log(line);
}
