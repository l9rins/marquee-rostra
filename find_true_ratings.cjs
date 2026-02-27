const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const playerStart = 139378; // LeBron

const candidates = [];

// Ratings are typically 8 bits. They could be anywhere.
for (let byte = 30; byte <= 250; byte++) {
    for (let bit = 0; bit < 8; bit++) {
        const ratings = [];
        let curByte = byte;
        let curBit = bit;
        
        // Let's read 100 consecutive 8-bit values and decode them as ratings
        for (let t = 0; t < 60; t++) { 
            let result = 0;
            let tempByte = curByte;
            let tempBit = curBit;
            for (let i = 0; i < 8; i++) {
                const bitVal = (buffer[playerStart + tempByte] >> (7 - tempBit)) & 1;
                result = (result << 1) | bitVal;
                tempBit++;
                if (tempBit >= 8) { tempBit = 0; tempByte++; }
            }
            
            let r = Math.floor(result / 3) + 25;
            ratings.push(r);
            
            curBit += 8;
            while (curBit >= 8) { curBit -= 8; curByte++; }
        }
        
        candidates.push({byte, bit, ratings});
    }
}

// We want to find a block where multiple ratings are exactly 99.
for (let c of candidates) {
    let r99s = [];
    for (let i=0; i<60; i++) {
        if (c.ratings[i] >= 98 && c.ratings[i] <= 100) {
            r99s.push(i);
        }
    }
    
    if (r99s.length >= 3) {
        console.log(`\nByte: ${c.byte}, Bit: ${c.bit} -> 99s at indices [${r99s.join(', ')}]`);
        console.log(`First 20 Ratings: ${c.ratings.slice(0, 20).join(', ')}`);
    }
}
