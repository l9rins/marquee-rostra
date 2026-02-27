const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function rawToDisplay(raw) {
    return Math.floor(raw / 3) + 25;
}

console.log("Searching the full memory map for authentic high-OVR superstars...");

// Let's use the proven 451 offset for OVR
const OVR_OFFSET = 451;

let foundCount = 0;

for (let offset = 0; offset < buffer.length - 1000; offset++) {
    let cfid = buffer.readUInt16LE(offset + 28);
    
    // Check known star boundaries
    if (cfid === 1015 || cfid === 633 || cfid === 1611 || cfid === 1014 || cfid === 1013) {
        
        let ovrRaw = buffer[offset + OVR_OFFSET];
        let ovr = rawToDisplay(ovrRaw);
        
        // Real stars must have an OVR >= 80 in NBA 2K14 (except Ray Allen who might be ~81, meaning > 80)
        // Curry = ~88
        // Wade = 92
        // Bosh = 84+
        // LeBron = 99
        
        if (ovr >= 80 && ovr <= 100) {
            console.log(`\n[ABSOLUTE MATCH] True offset found: ${offset}`);
            console.log(`CFID: ${cfid}`);
            console.log(`Overall Rating (Byte 451): ${ovr}`);
            
            // Print a few other stats to prove it isn't random
            let close = rawToDisplay(buffer[offset + 410]);
            let mid = rawToDisplay(buffer[offset + 411]);
            let three = rawToDisplay(buffer[offset + 424]); // actually wait, RATING_OFFSETS[3] is 424.
            console.log(`  Close: ${close} | Mid: ${mid}`);
            foundCount++;
        }
    }
}

if (foundCount === 0) {
    console.log("No high OVR superstars found! (This implies OVR offset is NOT 451 for these players)");
}
