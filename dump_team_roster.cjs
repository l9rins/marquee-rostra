const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 0x149A46;
const start = target - 200; // Look before the roster array
const end = start + 512;

console.log(`Dumping the Team block around 0x149A46 (76ers Roster array):`);
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
