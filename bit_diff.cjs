const fs = require('fs');

const path2k14 = 'inspiration_repo/RED MC/NBA Year 2013-14.ROS';
const buf2k14 = fs.readFileSync(path2k14);
const lebron2k14 = 139406 - 28;

// For 2K13, we'll try to find a known player or common pattern
// But even without it, we can look at the bits around CFID 1013 in 2k14
// and see if they match the expected 2k13 structure.

function getBits(buf, startByte, bitOff, count) {
    let val = 0;
    for (let i = 0; i < count; i++) {
        const totalBit = (startByte * 8) + bitOff + i;
        const bOff = Math.floor(totalBit / 8);
        const bBit = totalBit % 8;
        if ((buf[bOff] >> bBit) & 1) val |= (1 << i);
    }
    return val;
}

console.log("Analyzing 2K14 LeBron Record Bit-Offsets (Assuming CFID at bit 224):");

const startBit = 224 + 16; // Right after CFID

// 2K13 Appearance: 10 + 7 + 6 + 2 (Face, Tattoos, Skin, Body, etc.)
// Let's scan subsequent bits and see if they look like small enums or larger IDs.

for (let i = 0; i < 64; i++) {
    const bitVal = getBits(buf2k14, lebron2k14, startBit + i, 1);
    process.stdout.write(bitVal.toString());
    if ((i + 1) % 8 === 0) process.stdout.write(" ");
}
console.log("\n");

// If 2K14 added a variable, we expect the pattern to be shifted relative to 2K13 docs.
