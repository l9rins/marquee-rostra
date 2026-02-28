const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const lebronCfPos = 139406;
const lebronRec = lebronCfPos - 400; // Guessing an earlier base to be safe

console.log(`LeBron CFID (1013) found at ${lebronCfPos}`);

// Search for ANY valid looking CFID after LeBron within 1500 bytes
console.log(`Searching for next player CFID (0-15000) following LeBron...`);

for (let i = lebronCfPos + 2; i < lebronCfPos + 1500; i++) {
    const val = buffer.readUInt16LE(i);
    if (val > 0 && val < 5000) { // Most real CFIDs are in this range
        // Check if this same offset works for the NEXT record too (consistency)
        const size = i - lebronCfPos;
        const nextNextPos = i + size;
        if (nextNextPos + 1 < buffer.length) {
            const nextNextVal = buffer.readUInt16LE(nextNextPos);
            if (nextNextVal < 5000) {
                console.log(`🎯 Potential Size Match!`);
                console.log(`   - Size: ${size}`);
                console.log(`   - Next CFID (${val}) at ${i}`);
                console.log(`   - Next-Next CFID (${nextNextVal}) at ${nextNextPos}`);

                // Let's verify the "Schema" around this
                // If CFID is at relative offset X, then the name pointer should be nearby.
                // In 2K13/14, names are often ~24-50 bytes from CFID.
            }
        }
    }
}
