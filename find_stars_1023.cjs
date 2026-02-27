const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

console.log("Locating standard superstars rigidly fixed inside the 1314300 Master Block...");

const ROOT = 1314300;
const SIZE = 1023;

// Scan up to 2000 players deep in the 1023 array
for (let n = 0; n < 2000; n++) {
    let offset = ROOT + (n * SIZE);
    if (offset + 28 >= buffer.length) break;
    
    let cfid = buffer.readUInt16LE(offset + 28);
    
    if (cfid === 1013) console.log(`LeBron James (1013) found at exactly Root + ${n} = ${offset}`);
    if (cfid === 1015) console.log(`Dwyane Wade (1015) found at exactly Root + ${n} = ${offset}`);
    if (cfid === 633) console.log(`Ray Allen (633) found at exactly Root + ${n} = ${offset}`);
    if (cfid === 1611) console.log(`Stephen Curry (1611) found at exactly Root + ${n} = ${offset}`);
    if (cfid === 1014) console.log(`Chris Bosh (1014) found at exactly Root + ${n} = ${offset}`);
}
