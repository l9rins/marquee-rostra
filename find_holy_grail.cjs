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

console.log("Locating the holy grail structural offsets...");

const targetStars = [
    {cfid: 1013, name: "LeBron James"},
    {cfid: 1015, name: "Dwyane Wade"},
    {cfid: 633, name: "Ray Allen"},
    {cfid: 1611, name: "Stephen Curry"},
    {cfid: 1014, name: "Chris Bosh"}
];

let found = {};

for (let offset = 0; offset < buffer.length - 1000; offset++) {
    // Optimization: only read if the first byte of CFID matches one of our targets
    // 1013 = 0x03F5 -> F5 03
    // 1015 = 0x03F7 -> F7 03
    // 633 = 0x0279 -> 79 02
    // 1611 = 0x064B -> 4B 06
    // 1014 = 0x03F6 -> F6 03
    
    // Actually just readUInt16LE directly
    let cfid = buffer.readUInt16LE(offset + 28);
    for (let target of targetStars) {
        if (cfid === target.cfid) {
            let actualName = getPlayerName(offset);
            // Some names might have garbage trailing characters, check prefix
            if (actualName.includes(target.name)) {
                if (!found[target.name]) found[target.name] = [];
                found[target.name].push(offset);
                console.log(`[VERIFIED] ${target.name} found definitively at Offset: ${offset}`);
            }
        }
    }
}
