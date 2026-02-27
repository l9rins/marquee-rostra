const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

console.log("Starting global dynamic size brute forcer...");

for (let size = 700; size <= 1500; size++) {
    // To speed up, we don't need to check every `offset += 4`.
    // Let's just check offset += 4 up to 1,000,000 bytes
    for (let offset = 0; offset < 1000000; offset += 4) {
        
        const c1Off = offset + 28;
        const c2Off = offset + size + 28;
        const c3Off = offset + (size * 2) + 28;
        const c4Off = offset + (size * 3) + 28;
        
        if (c4Off + 1 >= buffer.length) break;
        
        let c1 = buffer.readUInt16LE(c1Off);
        let c2 = buffer.readUInt16LE(c2Off);
        let c3 = buffer.readUInt16LE(c3Off);
        let c4 = buffer.readUInt16LE(c4Off);
        
        // Typical CFIDs for real NBA players are 5 to 5000. Give or take some nulls (0)
        let valids = 0;
        if (c1 > 0 && c1 < 5000) valids++;
        if (c2 > 0 && c2 < 5000) valids++;
        if (c3 > 0 && c3 < 5000) valids++;
        if (c4 > 0 && c4 < 5000) valids++;
        
        if (valids >= 4) {
            // Found a 4-chain! Let's verify how deep it goes.
            let depth = 4;
            while (true) {
                let deeperOff = offset + (size * depth) + 28;
                if (deeperOff + 1 >= buffer.length) break;
                let cDeep = buffer.readUInt16LE(deeperOff);
                if (cDeep === 0 || (cDeep > 0 && cDeep < 10000)) {
                    depth++;
                } else {
                    break;
                }
            }
            
            if (depth > 20) {
                console.log(`\n!!! MASSIVE CHAIN DISCOVERED !!!`);
                console.log(`Size: ${size} bytes`);
                console.log(`Table Start Offset: ${offset}`);
                console.log(`Chain Depth (Consecutive Players): ${depth}`);
                break; // Break the offset loop to print and move to next size (or just stop)
            }
        }
    }
}
