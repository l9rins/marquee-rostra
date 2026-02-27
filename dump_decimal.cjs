const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const LEBRON_CFID = 1013;
const RECORD_SIZE = 911;

let playerStart = -1;
for (let i = 0; i < buffer.length - RECORD_SIZE; i += 4) {
    if (buffer[i + 28] === (LEBRON_CFID & 0xFF) && buffer[i + 29] === ((LEBRON_CFID >> 8) & 0xFF)) {
        playerStart = i;
        break;
    }
}

console.log(`LeBron Start Offset: 0x${playerStart.toString(16)} (${playerStart})`);

// Let's print the entire 911-byte record in decimal format.
// We'll print 16 bytes per line.
for (let i = 0; i < RECORD_SIZE; i += 16) {
    let line = `Byte ${i.toString().padStart(3, '0')}: `;
    for (let j = 0; j < 16; j++) {
        if (i + j < RECORD_SIZE) {
            line += buffer[playerStart + i + j].toString().padStart(3, ' ') + " ";
        }
    }
    console.log(line);
}
