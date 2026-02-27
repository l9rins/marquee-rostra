const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const STAR_PLAYERS = [
    { name: "LeBron James", index: 16 },
    { name: "Stephen Curry", index: 376 },
    { name: "Kevin Durant", index: 39 },
    { name: "Dwyane Wade", index: 3 },
    { name: "Generic CAP (Index 0)", index: 0 }
];

const ANCHOR_OFFSET = 1314300;
const STRUCT_SIZE = 1023;
const GEAR_START = 129;
const GEAR_BYTES = 30; // 129 to 158

console.log(`Extracting 15 bytes of Gear data (120 bits) for analysis...`);
console.log("-".repeat(80));

for (const p of STAR_PLAYERS) {
    const pOffset = ANCHOR_OFFSET + (p.index * STRUCT_SIZE);
    
    // Check if valid by grabbing CFID (bytes 29-30)
    const cfid = buffer.readUInt16LE(pOffset + 29);
    
    // Extract 15 bytes of Gear
    const gearBlock = buffer.subarray(pOffset + GEAR_START, pOffset + GEAR_START + GEAR_BYTES);
    
    // Convert to binary string
    let binStr = "";
    for (let i = 0; i < GEAR_BYTES; i++) {
        binStr += gearBlock[i].toString(2).padStart(8, '0') + " ";
    }
    
    console.log(`${p.name.padEnd(25)} (CFID: ${cfid})`);
    console.log(`Hex:  ${gearBlock.toString('hex').match(/.{1,2}/g).join(' ')}`);
    console.log(`Bin:  ${binStr}`);
    console.log("-".repeat(80));
}
