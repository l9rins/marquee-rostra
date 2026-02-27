const fs = require('fs');
const fileBuffer = fs.readFileSync('c:/Users/Mark Lorenz/Desktop/rostra/inspiration_repo/RED MC/NBA Year 2013-14.ROS');
const recSize = 1023;

for (let i = 0; i < 50; i++) {
    const offset = 4 + i * recSize;
    if (offset + recSize > fileBuffer.length) break;
    const cfid = fileBuffer.readUInt16LE(offset + 29);
    
    // only print if it's a real player (CFID > 0)
    if (cfid > 0) {
        let h = fileBuffer[offset + 34];
        let w = fileBuffer[offset + 35];
        console.log(`P${i} CFID ${cfid}: Height ${h}cm, Weight (Raw: ${w}, +100: ${w + 100} lbs)`);
    }
}
