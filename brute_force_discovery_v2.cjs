const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const heatIds = [1013, 1015, 1014]; // LeBron, Wade, Bosh
const sizes = [911, 1023, 1024, 1363, 1400];
const offsets = [];
for (let i = 0; i < 900; i++) offsets.push(i);

console.log(`Brute-forcing Heat trio discovery...`);

for (let size of sizes) {
    for (let cfidOff of offsets) {
        // Optimization: scan for the first 1013
        let start = 0;
        while(true) {
            let lebronPos = buffer.indexOf(Buffer.from([0xf5, 0x03]), start);
            if (lebronPos === -1) break;
            
            const recStart = lebronPos - cfidOff;
            if (recStart >= 0) {
                // Check for Wade
                const wadePos = recStart + size + cfidOff;
                const boshPos = recStart + 2 * size + cfidOff;
                
                if (boshPos + 1 < buffer.length) {
                    if (buffer.readUInt16LE(wadePos) === 1015 && buffer.readUInt16LE(boshPos) === 1014) {
                        console.log(`🎯 MATCH FOUND!`);
                        console.log(`   - Record Size: ${size}`);
                        console.log(`   - CFID Offset: ${cfidOff}`);
                        console.log(`   - Table Start: ${recStart}`);
                        
                        // Check depth
                        let depth = 0;
                        while(true){
                            const o = recStart + depth * size + cfidOff;
                            if (o+1 >= buffer.length) break;
                            if (buffer.readUInt16LE(o) < 15000) depth++;
                            else break;
                        }
                        console.log(`   - Chain Depth: ${depth}`);
                        process.exit(0);
                    }
                }
            }
            start = lebronPos + 1;
        }
    }
}

console.log(`No match found.`);
