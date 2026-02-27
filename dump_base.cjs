const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 139406; // F5 03
const base = target - 28;

console.log(`LeBron Record Start: ${base}`);
console.log(`Byte 0-1 (Portrait ID?): ${buffer[base].toString(16)} ${buffer[base+1].toString(16)}`);
console.log(`Decimal Portrait ID: ${buffer.readUInt16LE(base)}`);

const buf = buffer.subarray(base, base + 200);

let hexStr = "";
for (let i=0; i<32; i++) {
    hexStr += buf[i].toString(16).padStart(2, '0') + " ";
}
console.log("\nFirst 32 bytes:\n" + hexStr);
