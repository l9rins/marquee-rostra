const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const STAR_PLAYERS = [
    { name: "LeBron James", index: 16 },
    { name: "Stephen Curry", index: 376 },
    { name: "Kevin Durant", index: 39 },
    { name: "Dwyane Wade", index: 3 },
    { name: "Damian Lillard", index: 21 },
    { name: "Generic CAP (Index 0)", index: 0 }
];

const ANCHOR_OFFSET = 1314300;
const STRUCT_SIZE = 1023;
const GEAR_START = 129;
const GEAR_BYTES = 30; // 129 to 158

console.log(`Extracting Shoe Model bits for analysis...`);
console.log("-".repeat(80));

for (const p of STAR_PLAYERS) {
    const pOffset = ANCHOR_OFFSET + (p.index * STRUCT_SIZE);
    const cfid = buffer.readUInt16LE(pOffset + 29);
    const gearBlock = buffer.subarray(pOffset + GEAR_START, pOffset + GEAR_START + GEAR_BYTES);
    
    // Reverse engineer bitstream - typical little endian or big endian bits?
    // Let's print out offset 84 to 120 bits as string
    let binStr = "";
    for (let i = 0; i < GEAR_BYTES; i++) {
        // Javascript toString(2) drops leading zeros.
        let b = gearBlock[i].toString(2).padStart(8, '0');
        // Bits are often read LSB to MSB or MSB to LSB. We will just dump the sequence visually.
        // Assuming left-to-right MSB or LSB, let's just print the reversed bits for each byte to see logical flow.
        binStr += b.split('').reverse().join('');
    }
    
    // The known schema ends at offset 84 (GShsBrLck) -> 4 bits. So offset 88 is Brand.
    // Let's print bits 88 to 120.
    const unknownBits = binStr.substring(84, 160);
    
    console.log(`${p.name.padEnd(25)} (CFID: ${cfid})`);
    console.log(`Bitstream [84-160]:`);
    console.log(`Lock(4): ${binStr.substring(84, 88)}`);
    console.log(`Brand(4): ${binStr.substring(88, 92)}`);
    console.log(`Rest: ${binStr.substring(92, 160)}`);
    
    // Try to parse Hex strings
    const restHex = [];
    for(let i=92; i<160; i+=4) {
        restHex.push(parseInt(binStr.substring(i, i+4), 2).toString(16));
    }
    console.log(`Rest as hex nibbles:   ${restHex.join(' ')}`);
    
    console.log("-".repeat(80));
}
