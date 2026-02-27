const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

console.log("Extracting authenticated superstars using 1023-byte leaps...");

let count = 0;
// Scan 2000 players deep
for (let offset = 1314300; offset + 1023 <= buffer.length; offset += 1023) {
    let cfid = buffer.readUInt16LE(offset + 28);
    
    if (cfid === 1013) console.log(`[${count}] LeBron James (1013) found at TRUE OFFSET: ${offset}`);
    if (cfid === 1015) console.log(`[${count}] Dwyane Wade (1015) found at TRUE OFFSET: ${offset}`);
    if (cfid === 633) console.log(`[${count}] Ray Allen (633) found at TRUE OFFSET: ${offset}`);
    if (cfid === 1611) console.log(`[${count}] Stephen Curry (1611) found at TRUE OFFSET: ${offset}`);
    if (cfid === 1014) console.log(`[${count}] Chris Bosh (1014) found at TRUE OFFSET: ${offset}`);
    if (cfid === 2162) console.log(`[${count}] Norris Cole (2162) found at TRUE OFFSET: ${offset}`);
    
    count++;
}
