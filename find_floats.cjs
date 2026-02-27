const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const target = 139406; // F5 03 for CFID
const portraitIdLocation = target - 28; // 139378

console.log(`Searching around Portrait ID offset: ${portraitIdLocation} for Height/Weight floats`);

// LeBron Height: ~203 cm
// LeBron Weight: ~250 lbs
// Let's scan from portraitIdLocation - 100 to portraitIdLocation + 100
for (let i = portraitIdLocation - 100; i < portraitIdLocation + 100; i++) {
    // Leftos reads them as BigEndian reversed, meaning LittleEndian?
    // BitConverter.ToSingle(brOpen.ReadNonByteAlignedBytes(4).Reverse().ToArray(), 0)
    // Wait, `.Reverse().ToArray()` on BigEndian bytes means it parses as LittleEndian! Or vice versa.
    // Let's just try both.
    
    let floatLE = buffer.readFloatLE(i);
    let floatBE = buffer.readFloatBE(i);
    
    // Look for Height (around 190-220 cm) or Weight (around 200-300 lbs)
    if (floatLE > 190 && floatLE < 300) {
        console.log(`Match LE Float at offset ${i} (Delta ${i - portraitIdLocation}): ${floatLE}`);
    }
    if (floatBE > 190 && floatBE < 300) {
        console.log(`Match BE Float at offset ${i} (Delta ${i - portraitIdLocation}): ${floatBE}`);
    }
}
