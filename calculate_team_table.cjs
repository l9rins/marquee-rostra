const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 0x2850ec;
const searchRangeStart = target - 0x1000;
const searchRangeEnd = target + 0x2000;
const expectedTeamCount = 100; // There are around 100 teams including historical

// In NBA 2K14, a Team Record size is usually exactly 716 bytes according to some older mods, but let's be sure.
// Roster arrays: Let's use the known 76ers array match from earlier.
// Wait, my previous script found the 76ers roster array at `0x149A46`.
// If the roster array is part of the Team record, then the Team table is at ~0x149000, NOT 0x285000!
// Let's re-examine that match `0x149A46`.
console.log('Examining the surrounding bytes around the 76ers Roster array at 0x149A46');
const rosterOffset = 0x149A46;
const p1 = buffer.readUInt16LE(rosterOffset);
const p2 = buffer.readUInt16LE(rosterOffset + 2);
const p3 = buffer.readUInt16LE(rosterOffset + 4);
console.log(`Pointers: [${p1}, ${p2}, ${p3}]`);

// Let's scan backwards to see if we see "Philadelphia" or "76ers" or "PHI" strings
// BUT we know team strings are packed in a String Table, so we should look for 16-bit or 32-bit pointers to those strings.
// Let's scan forward for the Team 1 (Bucks) array!
const BucksArray = [1, 9, 17];
let bucksOffset = 0;
for (let i = rosterOffset + 100; i < rosterOffset + 2000; i += 2) {
    if (buffer.readUInt16LE(i) === BucksArray[0] &&
        buffer.readUInt16LE(i + 2) === BucksArray[1] &&
        buffer.readUInt16LE(i + 4) === BucksArray[2]) {
        bucksOffset = i;
        break;
    }
}
console.log(`Bucks Roster Array found at: 0x${bucksOffset.toString(16)}`);
if (bucksOffset > 0) {
    const recordSize = bucksOffset - rosterOffset;
    console.log(`Calculated Team Record Size: ${recordSize} bytes (0x${recordSize.toString(16)})`);

    // Now we can calculate the exact Team Table start!
    // If Team 0 roster is at `rosterOffset`, then Team 0 start is `rosterOffset - roster_offset_within_record`.
    // Let's dump the 0x149000 area.
} else {
    console.log("Could not find Bucks array nearby...");
}
