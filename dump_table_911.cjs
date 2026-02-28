const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const base = 27441;
const size = 911;
const cfidOff = 28;

console.log(`Dumping first 50 records from table at ${base} (Size ${size})...`);

for (let i = 0; i < 50; i++) {
    const rec = base + i * size;
    const cfid = buffer.readUInt16LE(rec + cfidOff);

    // Names are usually strings around the record start or specialized pointers.
    // In 2K13/14, names are often at the start (offset 0 and offset something else).
    const name1 = buffer.slice(rec, rec + 32).toString('ascii').replace(/[^\x20-\x7E]/g, '');

    console.log(`Record ${i}: CFID ${cfid} | Data Start: [${name1}]`);
}
