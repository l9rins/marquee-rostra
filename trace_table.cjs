const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const knownOffsets = {
    "LeBron": 139406,
    // let's rediscover KD and Kobe to get their exact file offsets
};

function findPattern(byte1, byte2) {
    const offsets = [];
    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === byte1 && buffer[i + 1] === byte2) {
            offsets.push(i);
        }
    }
    return offsets;
}

const lebron = findPattern(0xF5, 0x03);
const kd = findPattern(0x83, 0x05);
const kobe = findPattern(0xC3, 0x00);

// We know block size is 911.
// Let's find players that are multiples of 911 apart from LeBron
const lebronFirst = lebron[0]; // 139406

console.log(`LeBron offset: ${lebronFirst}`);

function testOffsetRelativeToLeBron(offset, name) {
    const diff = offset - lebronFirst;
    const blocksAway = diff / 911;
    if (Math.abs(blocksAway - Math.round(blocksAway)) < 0.0001) {
        console.log(`- ${name} at ${offset} is exactly ${Math.round(blocksAway)} blocks away.`);
        return true;
    }
    return false;
}

for (const k of kd) if (testOffsetRelativeToLeBron(k, "KD")) break;
for (const k of kobe) if (testOffsetRelativeToLeBron(k, "Kobe")) break;

// If they are exact multiples of 911 away, then they ALL share the same block start offset relative to their CFID!
// Now we need to find the START of the whole player table.
// Usually, it's after the team table marker. But we couldn't find 0x2850EC.
// Let's trace backwards from LeBron by 911 bytes at a time, checking if the CFID at that position is valid (>0, <15000).
let currentStart = lebronFirst;
while (currentStart >= 911) {
    const prev = currentStart - 911;
    const cfid = buffer.readUInt16LE(prev);
    // There can be empty records (CFID 0) at the start or valid players.
    // Eventually we'll hit garbage.
    if (cfid > 15000) {
        break; // Hit garbage
    }
    currentStart = prev;
}

const tableStartCFID = currentStart;
console.log(`\nThe first valid CFID in the sequence is at ${tableStartCFID}`);
console.log(`This is ${(tableStartCFID - 28).toString(16)} if CFID offset is 28.`);

// Dump 64 bytes around the assumed table start (tableStartCFID - 28)
const blockStart = tableStartCFID - 28;
console.log(`\nDump of the very first player block start (assumed CFID offset 28):`);
const end = Math.min(buffer.length, blockStart + 64);
for (let i = blockStart; i < end; i += 16) {
    let line = `${i.toString(16).padStart(8, '0')}  `;
    for (let j = 0; j < 16; j++) {
        if (i + j < end) {
            line += buffer[i + j].toString(16).padStart(2, '0') + ' ';
        } else {
            line += '   ';
        }
    }
    line += ' |';
    for (let j = 0; j < 16; j++) {
        if (i + j < end) {
            const charCode = buffer[i + j];
            line += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
        }
    }
    line += '|';
    console.log(line);
}
