const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const PLAYER_TABLE_OFFSET = 0x21ce3;
const PLAYER_RECORD_SIZE = 1023;
const MAX_PLAYERS = 1500;

// Find players for team 0 (76ers)
const Team0_Players = [];
let playerTableOffset = 0;
for (let offset = 0; offset < buffer.length - PLAYER_RECORD_SIZE * 3; offset += 4) {
    const cfid1 = buffer.readUInt16LE(offset + 28);
    const cfid2 = buffer.readUInt16LE(offset + PLAYER_RECORD_SIZE + 28);
    const cfid3 = buffer.readUInt16LE(offset + (PLAYER_RECORD_SIZE * 2) + 28);
    if ((cfid1 === 0 || (cfid1 > 0 && cfid1 < 10000)) && (cfid2 > 0 && cfid2 < 10000) && (cfid3 > 0 && cfid3 < 10000)) {
        playerTableOffset = offset;
        break;
    }
}

for (let i = 0; i < MAX_PLAYERS; i++) {
    const offset = playerTableOffset + i * PLAYER_RECORD_SIZE;
    if (offset + PLAYER_RECORD_SIZE > buffer.length) break;
    const cfid = buffer.readUInt16LE(offset + 28);
    if (cfid === 0 && i > 10) break;
    const team1 = buffer.readUInt8(offset + 1);
    if (team1 === 0) Team0_Players.push(i);
}

// Search for the Team0 roster array
if (Team0_Players.length >= 6) {
    const p1 = Team0_Players[0], p2 = Team0_Players[1], p3 = Team0_Players[2],
        p4 = Team0_Players[3], p5 = Team0_Players[4], p6 = Team0_Players[5];
    console.log(`Searching for: [${p1}, ${p2}, ${p3}, ${p4}, ${p5}, ${p6}]`);
    let found = [];
    for (let i = 0; i < buffer.length - 12; i += 2) {
        if (buffer.readUInt16LE(i) === p1 &&
            buffer.readUInt16LE(i + 2) === p2 &&
            buffer.readUInt16LE(i + 4) === p3 &&
            buffer.readUInt16LE(i + 6) === p4 &&
            buffer.readUInt16LE(i + 8) === p5 &&
            buffer.readUInt16LE(i + 10) === p6) {
            found.push(i);
        }
    }
    console.log(`Found sequence at: ${found.map(o => "0x" + o.toString(16)).join(', ')}`);

    // Once we find the Roster array, the Team record starts some bytes before it.
    // Let's also do Team 1 (Bucks) to find the Team Record Size!
    const Team1_Players = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
        const offset = playerTableOffset + i * PLAYER_RECORD_SIZE;
        if (buffer.readUInt8(offset + 1) === 1) Team1_Players.push(i);
    }
    console.log(`Team 1 Players:`, Team1_Players.slice(0, 6));
    let t1Found = [];
    if (Team1_Players.length >= 6) {
        const p1 = Team1_Players[0], p2 = Team1_Players[1], p3 = Team1_Players[2],
            p4 = Team1_Players[3], p5 = Team1_Players[4], p6 = Team1_Players[5];
        for (let i = 0; i < buffer.length - 12; i += 2) {
            if (buffer.readUInt16LE(i) === p1 &&
                buffer.readUInt16LE(i + 2) === p2 &&
                buffer.readUInt16LE(i + 4) === p3 &&
                buffer.readUInt16LE(i + 6) === p4 &&
                buffer.readUInt16LE(i + 8) === p5 &&
                buffer.readUInt16LE(i + 10) === p6) {
                t1Found.push(i);
            }
        }
        console.log(`Found Team 1 sequence at: ${t1Found.map(o => "0x" + o.toString(16)).join(', ')}`);

        if (found.length > 0 && t1Found.length > 0) {
            const distance = t1Found[0] - found[0];
            console.log(`Distance between Team 0 and Team 1 Roster arrays: ${distance} bytes.`);
            console.log(`This is the TEAM RECORD SIZE! (Usually 680 or 880 in 2K14).`);
        }
    }
}
