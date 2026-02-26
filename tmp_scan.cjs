const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

// Find "James"
let index = -1;
const james = Buffer.from('James\0', 'ascii');
for (let i = 0; i < buffer.length - james.length; i++) {
    let match = true;
    for (let j = 0; j < james.length; j++) {
        if (buffer[i + j] !== james[j]) {
            match = false;
            break;
        }
    }
    if (match) {
        index = i;
        console.log(`Found "James" at offset ${i} (0x${i.toString(16)})`);
    }
}

// Write the bytes around the first match to see the struct
if (index !== -1) {
    const start = Math.max(0, index - 256);
    const end = Math.min(buffer.length, index + 256);
    console.log('Hex dump around "James":');
    let hexDump = '';
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
}
