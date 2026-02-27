const fs = require('fs');

const fileBuffer = fs.readFileSync('C:\\Users\\Mark Lorenz\\Desktop\\rostra\\inspiration_repo\\RED MC\\NBA Year 2013-14.ROS');

const CFID_OFFSET = 28;
const targetCFIDs = [1013, 1015, 161, 633, 1014];
const names = { 1013: 'LeBron', 1015: 'Wade', 161: 'Curry', 633: 'R.Allen', 1014: 'Bosh' };

const players = [];

// Do a full file scan to find the exact byte offsets for these 5 players!
for (let offset = 0; offset < fileBuffer.length - 1000; offset++) {
    const cfid = fileBuffer.readUInt16LE(offset + CFID_OFFSET);
    if (targetCFIDs.includes(cfid)) {
        // Double check it's really the player by looking at some known data or just assume it's them.
        // We know from find_true_size that LeBron 1013 is at 139378.
        players.push({ cfid, name: names[cfid], offset });
        
        // Remove from target list so we only get the FIRST occurrence
        targetCFIDs.splice(targetCFIDs.indexOf(cfid), 1);
        if (targetCFIDs.length === 0) break;
    }
}

console.log("Found players:", players.map(p => `${p.name} (${p.offset})`).join(', '));

// Sort players by name so the columns are consistent
players.sort((a,b) => a.name.localeCompare(b.name));

let header = 'Byte | ';
players.forEach(p => header += p.name.padEnd(10));
console.log(header);
console.log('-'.repeat(header.length));

for (let b = 190; b <= 260; b++) {
    let row = `${b.toString().padStart(4)} | `;
    for (const p of players) {
        const val = fileBuffer[p.offset + b];
        row += val.toString().padEnd(10);
    }
    console.log(row);
}
