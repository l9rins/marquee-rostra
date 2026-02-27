const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const PLAYER_TABLE_OFFSET = 0x21ce3; // From C++ discovery (or close to it)
const PLAYER_RECORD_SIZE = 1023;
const MAX_PLAYERS = 1500;

// Re-discover table start if needed, but let's just use the known logic
let playerTableOffset = 0;
for (let offset = 0; offset < buffer.length - PLAYER_RECORD_SIZE * 3; offset += 4) {
    const cfid1 = buffer.readUInt16LE(offset + 28);
    const cfid2 = buffer.readUInt16LE(offset + PLAYER_RECORD_SIZE + 28);
    const cfid3 = buffer.readUInt16LE(offset + (PLAYER_RECORD_SIZE * 2) + 28);

    if ((cfid1 === 0 || (cfid1 > 0 && cfid1 < 10000)) &&
        (cfid2 > 0 && cfid2 < 10000) &&
        (cfid3 > 0 && cfid3 < 10000)) {
        playerTableOffset = offset;
        break;
    }
}

console.log(`Player table offset defined at: 0x${playerTableOffset.toString(16)}`);

// In VITAL_TEAM_ID1: offset = 1 byte, 0 bit, size 8 bits
const Team0_Players = [];

for (let i = 0; i < MAX_PLAYERS; i++) {
    const offset = playerTableOffset + i * PLAYER_RECORD_SIZE;
    if (offset + PLAYER_RECORD_SIZE > buffer.length) break;

    const cfid = buffer.readUInt16LE(offset + 28);
    if (cfid === 0 && i > 10) {
        // end of table heuristic
        const nextCfid = buffer.readUInt16LE(offset + PLAYER_RECORD_SIZE + 28);
        if (nextCfid === 0) break;
    }

    // VITAL_TEAM_ID1 is an 8-bit integer at bit offset 1 * 8 = 8 starting at byte... wait.
    // In RosterEditor.cpp: write_bits_at(1, 0, 8) -> byte 1, bit 0 -> exactly byte 1 of the record
    const team1 = buffer.readUInt8(offset + 1);

    // Check Status... Wait, free agents are team 0xff?
    if (team1 === 0) {
        Team0_Players.push(i);
    }
}

console.log(`76ers (Team 0) has ${Team0_Players.length} players. Indices:`, Team0_Players);

// In 2K14 ROS files, team roster arrays are usually 16-bit IDs per player.
// Let's create a search pattern of the first 3 indices and search the file.
if (Team0_Players.length >= 3) {
    const p1 = Team0_Players[0];
    const p2 = Team0_Players[1];
    const p3 = Team0_Players[2];

    console.log(`Searching for sequence of 16-bit ints: [${p1}, ${p2}, ${p3}]`);
    let found = [];
    for (let i = 0; i < buffer.length - 6; i += 2) { // 2-byte aligned usually, but could be unstructured
        if (buffer.readUInt16LE(i) === p1 &&
            buffer.readUInt16LE(i + 2) === p2 &&
            buffer.readUInt16LE(i + 4) === p3) {
            found.push(i);
        }
    }

    console.log(`Found sequence at offsets: ${found.map(o => "0x" + o.toString(16)).join(', ')}`);
}

// Alternatively, let's search for 32-bit?
if (Team0_Players.length >= 2) {
    const p1 = Team0_Players[0];
    const p2 = Team0_Players[1];

    let found = [];
    for (let i = 0; i < buffer.length - 8; i += 4) { // 4-byte aligned
        if (buffer.readUInt32LE(i) === p1 &&
            buffer.readUInt32LE(i + 4) === p2) {
            found.push(i);
        }
    }
    if (found.length > 0) {
        console.log(`Found 32-bit sequence at offsets: ${found.map(o => "0x" + o.toString(16)).join(', ')}`);
    } else {
        console.log(`No 32-bit sequence found (length >= 2).`);
    }
}

