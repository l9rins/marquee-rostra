const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function getPlayerName(base) {
    if (base + 60 > buffer.length) return "";
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    let name = "";
    if (fnOffset > 0 && fnOffset < buffer.length - 100) {
        let i = fnOffset;
        while(buffer[i] && i < fnOffset + 30) { name += String.fromCharCode(buffer[i++]); }
    }
    name += " ";
    if (lnOffset > 0 && lnOffset < buffer.length - 100) {
        let i = lnOffset;
        while(buffer[i] && i < lnOffset + 30) { name += String.fromCharCode(buffer[i++]); }
    }
    return name.trim();
}

console.log("Starting unified sweep from Root 820...");

let foundValid = false;

for (let offset = 820; offset + 911 < buffer.length; offset += 911) {
    const cfid = buffer.readUInt16LE(offset + 28);
    // Print all major target CFIDs
    if (cfid === 1013 || cfid === 1015 || cfid === 633 || cfid === 1611 || cfid === 1014) {
        let name = getPlayerName(offset);
        let pos = buffer[offset + 60];
        console.log(`[ALIGNED RECO] ${name} | CFID: ${cfid} | Offset: ${offset} | Pos: ${pos}`);
        foundValid = true;
    }
}

if (!foundValid) {
    console.log("No targets found in the pure 820-aligned block. This means the engine's 820 root is NOT the main NBA array.");
}
