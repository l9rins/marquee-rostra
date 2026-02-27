const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

console.log("Locating all valid 1023-byte arrays...");

const SIZE = 1023;
let visited = new Set();
let allArrays = [];

for (let offset = 0; offset < buffer.length - 1000; offset++) {
    if (visited.has(offset)) continue;
    
    // Check if `offset` starts a valid chain of at least 10 valid CFIDs
    let depth = 0;
    let starsFound = [];
    
    while (true) {
        let curOff = offset + (SIZE * depth);
        if (curOff + 28 >= buffer.length) break;
        
        let cfid = buffer.readUInt16LE(curOff + 28);
        if (cfid === 0 || cfid > 15000) {
            break; // Stop chain
        }
        
        // CFID is valid
        visited.add(curOff);
        depth++;
        
        // Log targets
        if (cfid === 1013) starsFound.push(`LeBron (offset ${curOff})`);
        if (cfid === 1015) starsFound.push(`Wade (offset ${curOff})`);
        if (cfid === 633) starsFound.push(`Ray Allen (offset ${curOff})`);
        if (cfid === 1014) starsFound.push(`Bosh (offset ${curOff})`);
        if (cfid === 1611) starsFound.push(`Curry (offset ${curOff})`);
    }
    
    if (depth >= 10) {
        console.log(`\n--- ARRAY DISCOVERED ---`);
        console.log(`Start Offset: ${offset}`);
        console.log(`End Offset: ${offset + (SIZE * depth)}`);
        console.log(`Player Count: ${depth}`);
        if (starsFound.length > 0) {
            console.log(`Superstars Included:`);
            console.log(starsFound.join('\n'));
        } else {
            console.log(`No primary superstars present.`);
        }
    }
}
console.log("Scan complete.");
