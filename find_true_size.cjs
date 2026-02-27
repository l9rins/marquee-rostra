const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const base = 139378; // Confirmed LeBron James

// Heat CFIDs: Wade(1015), Bosh(1014), Allen(633), Chalmers(1519), Haslem(1016), Battier(824), Cole(2162)
const heatCfids = [1013, 1015, 1014, 633, 1519, 1016, 824, 2162];

console.log("Brute forcing true structural record size from known LeBron offset...");

for (let size = 800; size <= 1000; size++) {
    let nextOffset = base + size;
    let prevOffset = base - size;
    
    try {
        let nextCfid = buffer.readUInt16LE(nextOffset + 28);
        if (heatCfids.includes(nextCfid)) {
            console.log(`\n!!! TRUE NEXT-SIZE MATCH: ${size} bytes !!!`);
            console.log(`Found Next CFID: ${nextCfid} at ${nextOffset}`);
        }
        
        let prevCfid = buffer.readUInt16LE(prevOffset + 28);
        if (heatCfids.includes(prevCfid)) {
            console.log(`\n!!! TRUE PREV-SIZE MATCH: ${size} bytes !!!`);
            console.log(`Found Prev CFID: ${prevCfid} at ${prevOffset}`);
        }
    } catch(e) {}
}

// Let's also check up to 2 away (maybe LeBron is separated by 1)
for (let size = 800; size <= 1000; size++) {
    let nextOffset2 = base + size * 2;
    let nextOffset3 = base + size * 3;
    let nextOffset4 = base + size * 4;
    
    try {
        let c2 = buffer.readUInt16LE(nextOffset2 + 28);
        let c3 = buffer.readUInt16LE(nextOffset3 + 28);
        let c4 = buffer.readUInt16LE(nextOffset4 + 28);
        
        if (heatCfids.includes(c2) || heatCfids.includes(c3) || heatCfids.includes(c4)) {
            // Only print if we found multiple matches to confirm size
            let hits = 0;
            if (heatCfids.includes(c2)) hits++;
            if (heatCfids.includes(c3)) hits++;
            if (heatCfids.includes(c4)) hits++;
            
            if (hits >= 2) {
                console.log(`\n!!! MULTIPLE CHAIN MATCH FOR SIZE: ${size} bytes !!!`);
                console.log(`C2: ${c2}, C3: ${c3}, C4: ${c4}`);
            }
        }
    } catch(e) {}
}
