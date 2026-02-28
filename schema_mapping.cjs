const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

// We know LeBron (1013) is at 139406.
// We suspect record size 1024.
// If CFID is at +28 (bytes), then CFID starts at bit 224.

console.log(`Analyzing record structure around LeBron...`);

const base = 139406 - 28; // Standard assumption

function getBit(byteArr, totalBitOffset) {
    const byteOffset = Math.floor(totalBitOffset / 8);
    const bitInByte = totalBitOffset % 8;
    return (byteArr[byteOffset] >> bitInByte) & 1;
}

function readBits(byteArr, startBit, count) {
    let val = 0;
    for (let i = 0; i < count; i++) {
        if (getBit(byteArr, startBit + i)) {
            val |= (1 << i);
        }
    }
    return val;
}

// In the schema: Names:3; General:9; Bio:22; Appearance:28
// Bio contains BirthDay, BirthMonth, BirthYear, Hand, DunkHand, YearsPro, etc.
// Appearance contains Height, Weight, PortraitID, GenericFace, CF_ID.

// CF_ID is near the end of Appearance.
// Let's look at the bits before it.

console.log(`[Bio/Appearance Segment]`);
for (let i = 0; i < 400; i += 8) {
    const val = buffer.readUInt8(base + i / 8);
    console.log(`Byte ${i / 8}: ${val.toString(2).padStart(8, '0')} (${val})`);
}
