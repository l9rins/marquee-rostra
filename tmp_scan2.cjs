const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    process.exit(1);
}
const buffer = fs.readFileSync(filePath);
console.log('File loaded, size:', buffer.length);

const TEAM_TABLE_MARKER = 0x2850EC;
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

let playerTableOffset = -1;
for (let offset = 0; offset < buffer.length - 16; offset += 4) {
    if (view.getUint32(offset, true) === TEAM_TABLE_MARKER) {
        const headerSize = view.getUint32(offset + 4, true);
        playerTableOffset = offset + headerSize;
        console.log('Found team table marker at', offset.toString(16), 'Header size:', headerSize);
        console.log('Candidate player table offset:', playerTableOffset.toString(16));
        break;
    }
}

if (playerTableOffset !== -1) {
    // Let's dump the first 1000 bytes of the player table to find patterns
    console.log('Hex dump of start of player table:');
    for (let i = 0; i < 20; i++) {
        let line = `${(playerTableOffset + i * 16).toString(16).padStart(8, '0')}  `;
        for (let j = 0; j < 16; j++) {
            line += buffer[playerTableOffset + i * 16 + j].toString(16).padStart(2, '0') + ' ';
        }
        console.log(line);
    }

    // Attempt to guess the record size by looking for repeating patterns at +28 (CFID)
    console.log('Guessing record size...');
    for (let recordSize = 100; recordSize <= 550; recordSize++) {
        let valid = 0;
        let cfids = [];
        for (let j = 0; j < 10; j++) {
            const off = playerTableOffset + j * recordSize + 28;
            if (off + 1 < buffer.length) {
                const cfid = view.getUint16(off, true);
                if (cfid > 0 && cfid < 15000) {
                    valid++;
                    cfids.push(cfid);
                }
            }
        }
        if (valid > 8) {
            console.log(`Possible record size: ${recordSize}. First 10 CFIDs: ${cfids.join(', ')}`);
        }
    }
} else {
    console.log("Team table marker not found.");
}
