const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function getPlayerName(base) {
    if (base + 60 > buffer.length) return null;
    const fnOffset = buffer.readUInt32LE(base + 52);
    const lnOffset = buffer.readUInt32LE(base + 56);
    
    // Valid string pointers usually live in the 2,500,000 to 3,000,000 range in these files
    if (fnOffset < 100000 || fnOffset > buffer.length - 100) return null;
    if (lnOffset < 100000 || lnOffset > buffer.length - 100) return null;
    
    let name = "";
    let i = fnOffset;
    let limit = 0;
    while(buffer[i] !== 0 && limit < 30) { 
        let c = buffer[i++];
        if(c < 32 || c > 126) return null; // Invalid ASCII
        name += String.fromCharCode(c);
        limit++;
    }
    
    name += " ";
    i = lnOffset;
    limit = 0;
    while(buffer[i] !== 0 && limit < 30) { 
        let c = buffer[i++];
        if(c < 32 || c > 126) return null;
        name += String.fromCharCode(c);
        limit++; 
    }
    
    return name.trim();
}

const targets = [
    "LeBron James", "Dwyane Wade", "Ray Allen", "Stephen Curry",
    "Kevin Durant", "Kobe Bryant", "Carmelo Anthony", "Chris Bosh",
    "Chris Paul", "Russell Westbrook"
];

console.log("Scanning entire buffer for real superstar records...");

for (let i = 0; i < buffer.length - 1000; i++) {
    let cfid = buffer.readUInt16LE(i + 28);
    // Ignore garbage CFIDs to speed things up (stars are within 1 to 3000 typically)
    if (cfid > 0 && cfid < 3000) {
        let name = getPlayerName(i);
        if (name && targets.includes(name)) {
            let mod911 = i % 911;
            console.log(`Found [${name}] at Offset: ${i} | CFID: ${cfid} | Modulo 911: ${mod911}`);
        }
    }
}
