const fs = require('fs');
const fileBuffer = fs.readFileSync('c:/Users/Mark Lorenz/Desktop/rostra/inspiration_repo/RED MC/NBA Year 2013-14.ROS');
const payloadStart = 4;
const recSize = 1023;

for (let offset = payloadStart; offset < fileBuffer.length; offset += recSize) {
    if (offset + recSize > fileBuffer.length) break;
    const cfid = fileBuffer.readUInt16LE(offset + 29);
    
    if (cfid === 1013) {
        console.log(`Found LeBron James at offset ${offset}`);
        let out = '';
        for (let j = 32; j < 60; j++) {
            out += `Byte ${j}: ${fileBuffer[offset + j]} (0x${fileBuffer[offset + j].toString(16)})\n`;
        }
        console.log(out);
        break;
    }
}
