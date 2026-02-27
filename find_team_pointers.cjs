const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const targetOffset = 2546592; // 0x26DBA0 (Philadelphia)
const targetOffset2 = 2546618; // 0x26DBFA (PHI)

console.log(`Searching for 32-bit pointer to ${targetOffset} (0x${targetOffset.toString(16)})`);

const offsets = [];
for (let i = 0; i <= buffer.length - 4; i += 4) {
    const val = buffer.readUInt32LE(i);
    if (val === targetOffset || val === targetOffset2) {
        offsets.push(i);
    }
}

console.log(`Pointers found at: ${offsets.map(o => o + " (0x" + o.toString(16) + ")").join(', ')}`);
