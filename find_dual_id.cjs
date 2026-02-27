const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const LEBRON_ID = 1013; // 0x03F5
const idHex1 = 0xF5;
const idHex2 = 0x03;

const offsets = [];
for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === idHex1 && buffer[i+1] === idHex2) {
        offsets.push(i);
    }
}

for (let i = 0; i < offsets.length - 1; i++) {
    const diff = offsets[i+1] - offsets[i];
    if (diff > 0 && diff < 100) {
        console.log(`Found two 1013s at ${offsets[i]} and ${offsets[i+1]} (Distance: ${diff})`);
    }
}
