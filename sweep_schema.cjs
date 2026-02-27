const fs = require('fs');
const content = fs.readFileSync('tutorial.txt', 'utf8');

// Match lines looking like:  BirthDay,           // Width: 8 bits
const regex = /^\s+([A-Za-z0-9_]+),\s*\/\/\s*Width:\s*(\d+)\s+bits?/gm;

let match;
let totalBits = 0;
let results = [];

while ((match = regex.exec(content)) !== null) {
    const fieldName = match[1];
    const widthBits = parseInt(match[2], 10);
    
    const byteOffset = Math.floor(totalBits / 8);
    const bitOffset = totalBits % 8;
    
    results.push({
        name: fieldName,
        width: widthBits,
        byteOff: byteOffset,
        bitOff: bitOffset
    });
    
    totalBits += widthBits;
}

// Find Vitals block starting point roughly around byte 33 (Position)
let startIdx = results.findIndex(r => r.name === 'Pos');
if (startIdx !== -1) {
    console.log("Found Pos at byte", results[startIdx].byteOff);
    for(let i = startIdx; i < Math.min(startIdx + 30, results.length); i++) {
        const r = results[i];
        console.log(`[Byte ${r.byteOff}, Bit ${r.bitOff}] ${r.name} (${r.width} bits)`);
    }
} else {
    console.log("Pos not found natively, dumping first 50");
    for(let i = 0; i < Math.min(50, results.length); i++) {
        const r = results[i];
        console.log(`[Byte ${r.byteOff}, Bit ${r.bitOff}] ${r.name} (${r.width} bits)`);
    }
}
