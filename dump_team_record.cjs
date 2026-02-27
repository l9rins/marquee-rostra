const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 2546618; // offset of 'PHI'
const start = target - 128; // go back a bit to find start of record
const end = start + 512;

console.log(`Dumping the Team block around 2546618 (PHI):`);
for (let i = start; i < end; i += 16) {
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
