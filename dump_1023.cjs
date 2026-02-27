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

console.log("Extracting authenticated 1023-byte structs from Base: 1314300");

let count = 0;
for (let offset = 1314300; count < 50; offset += 1023) {
    let cfid = buffer.readUInt16LE(offset + 28);
    let name = getPlayerName(offset);
    
    // Position (0=PG, 1=SG, 2=SF, 3=PF, 4=C)
    let pos = buffer[offset + 60];
    let posName = ["PG", "SG", "SF", "PF", "C"][pos] || "Unk";
    
    console.log(`[${count}] CFID: ${cfid.toString().padStart(4, ' ')} | POS: ${posName} | NAME: ${name} | Offset: ${offset}`);
    count++;
}
