const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function readBitsAt(absBase, byteOff, bitOff, count) {
    let pos = absBase + byteOff;
    let bitPos = bitOff;
    let result = 0;
    for (let i = 0; i < count; i++) {
        const bit = (buffer[pos] >> (7 - bitPos)) & 1;
        result = (result << 1) | bit;
        bitPos++;
        if (bitPos >= 8) { bitPos = 0; pos++; }
    }
    return result;
}

function dumpTendencies(base, name) {
    console.log(`\n--- ${name} (Offset: ${base}) ---`);
    const tendencies = [];
    let curByte = 479;
    let curBit = 6;
    for (let t = 0; t < 58; t++) { 
        let val = readBitsAt(base, curByte, curBit, 8);
        val = val & 127; // Mask MSB
        tendencies.push(val);
        curBit += 8;
        while (curBit >= 8) { curBit -= 8; curByte++; }
    }
    
    console.log(`[1] Driving Layup: ${tendencies[1]}  (High for Wade, Med-High for Allen)`);
    console.log(`[3] Driving Dunk: ${tendencies[3]}   (Med-High for Wade, Med for Allen)`);
    console.log(`[5] Alley-Oop: ${tendencies[5]}      (Med for Wade, Low for Allen)`);
    console.log(`[10] Shoot 3PT: ${tendencies[10]}    (Low for Wade, Max for Allen)`);
    console.log("Full: " + tendencies.slice(0, 30).join(', '));
}

function findPointerTo(str) {
    let bufStr = Buffer.from(str + '\0', 'ascii'); // null-terminated
    let idx = buffer.indexOf(bufStr);
    if (idx === -1) {
        // try without null term?
        idx = buffer.indexOf(Buffer.from(str, 'ascii'));
    }
    if (idx !== -1) {
        // Now find a 32-bit LE pointer to `idx`
        let ptrBuf = Buffer.alloc(4);
        ptrBuf.writeUInt32LE(idx, 0);
        
        let ptrIdx = buffer.indexOf(ptrBuf);
        // Usually FIRST_NAME_OFFSET is 52, LAST_NAME_OFFSET is 56
        // Let's find all occurrences of ptrBuf
        let currentPos = 0;
        let records = [];
        while ((currentPos = buffer.indexOf(ptrBuf, currentPos)) !== -1) {
            records.push(currentPos);
            currentPos += 4;
        }
        return records;
    }
    return [];
}

let rayRecords = findPointerTo("Ray");
for (let r of rayRecords) {
    // maybe this was a first name pointer?
    let base = r - 52;
    if (base > 0 && buffer[base + 60] !== undefined) {
        let fnOff = buffer.readUInt32LE(base + 52);
        let lnOff = buffer.readUInt32LE(base + 56);
        // check second name
        if (lnOff > 0 && lnOff < buffer.length) {
            let ln = "";
            let i = lnOff;
            while(buffer[i]!==0) { ln += String.fromCharCode(buffer[i++]); }
            if (ln === "Allen") dumpTendencies(base, "Ray Allen");
        }
    }
}

let wadeRecords = findPointerTo("Dwyane");
for (let r of wadeRecords) {
    let base = r - 52;
    if (base > 0 && buffer[base + 60] !== undefined) {
        let lnOff = buffer.readUInt32LE(base + 56);
        if (lnOff > 0 && lnOff < buffer.length) {
            let ln = "";
            let i = lnOff;
            while(buffer[i]!==0) { ln += String.fromCharCode(buffer[i++]); }
            if (ln === "Wade") dumpTendencies(base, "Dwyane Wade");
        }
    }
}

let curryRecords = findPointerTo("Stephen");
for (let r of curryRecords) {
    let base = r - 52;
    if (base > 0 && buffer[base + 60] !== undefined) {
        let lnOff = buffer.readUInt32LE(base + 56);
        if (lnOff > 0 && lnOff < buffer.length) {
            let ln = "";
            let i = lnOff;
            while(buffer[i]!==0) { ln += String.fromCharCode(buffer[i++]); }
            if (ln === "Curry") dumpTendencies(base, "Stephen Curry");
        }
    }
}
