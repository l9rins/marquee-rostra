const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const LEBRON_CFID = 1013;
const RECORD_SIZE = 911;

let playerStart = -1;
// Search for LeBron's CFID (assuming CFID offset 28 is safe, which we verified)
for (let i = 0; i < buffer.length - RECORD_SIZE; i += 4) {
    if (buffer[i + 28] === (LEBRON_CFID & 0xFF) && buffer[i + 29] === ((LEBRON_CFID >> 8) & 0xFF)) {
        playerStart = i;
        break;
    }
}

if (playerStart === -1) {
    console.log("LeBron not found.");
    process.exit(1);
}

console.log(`LeBron found at offset ${playerStart}`);

// Dump bytes 0 to 200 to find tendencies
console.log("\n--- BYTES 40 to 180 (Expected Tendency/Gear area) ---");
for (let i = 40; i < 180; i += 10) {
    let line = `Byte ${i.toString().padStart(3, '0')}: `;
    for (let j = 0; j < 10; j++) {
        if (i + j < buffer.length) {
            line += buffer[playerStart + i + j].toString().padStart(3, ' ') + " ";
        }
    }
    console.log(line);
}

// Tendencies usually consist of 58 consecutive bytes (8-bits each). Let's look for a block of values that resemble tendencies.
// E.g., James has high driving layup/dunk tendencies (often 255 or close to it).
// Current base assumption in code: Byte 65.
