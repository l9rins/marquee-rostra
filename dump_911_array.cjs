const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const base = 139378;

console.log("Dumping CFIDs from the proven 911-byte array spanning 724 players...");

let heatCfids = [1015, 633, 1014, 1519]; // Wade, Allen, Bosh, Chalmers
let foundHeat = [];

for (let i = 0; i < 724; i++) {
    let offset = base + (i * 911);
    let cfid = buffer.readUInt16LE(offset + 28);
    
    // Only print valid normal CFIDs to keep console clean, or log notable ones
    if (cfid > 0 && cfid < 3000) {
        if (heatCfids.includes(cfid)) {
            console.log(`[HEAT] Index ${i}: CFID = ${cfid} (Offset: ${offset}) !!!!!!!!!!`);
            foundHeat.push(cfid);
        } else if (cfid === 1611) {
            console.log(`[CURRY] Index ${i}: CFID = 1611 (Offset: ${offset}) !!!!!!!!!!`);
        }
        else if (i < 30) {
            // Print the first 30 players just to see what's physically next to LeBron
            console.log(`Index ${i}: CFID = ${cfid}`);
        }
    }
}

console.log(`\nScan finished. Total Heat players found in this 724-block: ${foundHeat.length}`);
