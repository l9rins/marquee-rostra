const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

console.log("Starting strict star-locked size brute forcer...");

for (let size = 700; size <= 1500; size++) {
    // Only check up to 1,500,000 to keep it fast
    for (let offset = 0; offset < 1500000; offset += 4) {
        
        // Scan 5 consecutive records
        let valids = 0;
        let hasStar = false;
        
        for (let depth = 0; depth < 5; depth++) {
            let curOff = offset + (size * depth) + 28;
            if (curOff + 1 >= buffer.length) break;
            
            let cfid = buffer.readUInt16LE(curOff);
            // 0 is illegal for this strict star check
            if (cfid > 0 && cfid < 5000) {
                valids++;
                if (cfid === 1013 || cfid === 1015 || cfid === 633 || cfid === 1611 || cfid === 1014) {
                    hasStar = true;
                }
            }
        }
        
        if (valids >= 4 && hasStar) {
            // Found a 5-chain containing a star! Test real depth.
            let depth = 5;
            let stars_found = [1013, 1015, 633, 1611, 1014];
            let stars_hit = [];
            
            while (true) {
                let deeperOff = offset + (size * depth) + 28;
                if (deeperOff + 1 >= buffer.length) break;
                
                let cDeep = buffer.readUInt16LE(deeperOff);
                if (cDeep > 0 && cDeep < 8000) {
                    if (stars_found.includes(cDeep)) stars_hit.push(cDeep);
                    depth++;
                } else {
                    break;
                }
            }
            
            if (depth >= 15) {
                console.log(`\n!!! TRUE NBA STRUCT SIZE DISCOVERED !!!`);
                console.log(`Size: ${size} bytes`);
                console.log(`Table Start Offset: ${offset}`);
                console.log(`Chain Depth: ${depth} consecutive valid non-zero players`);
                console.log(`Stars contained in chain: ${stars_hit.join(', ')}`);
                // Break out completely so we don't spam output
                process.exit(0);
            }
        }
    }
}
console.log("Scan complete.");
