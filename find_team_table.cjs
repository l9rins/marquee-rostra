const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function findString(str, encoding) {
    const offsets = [];
    const target = Buffer.from(str, encoding);
    for (let i = 0; i <= buffer.length - target.length; i++) {
        let match = true;
        for (let j = 0; j < target.length; j++) {
            if (buffer[i + j] !== target[j]) {
                match = false;
                break;
            }
        }
        if (match) {
            offsets.push(i);
        }
    }
    return offsets;
}

const teamsToFind = ['76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers', 'Grizzlies', 'Hawks', 'Heat', 'Hornets'];
const abbreviations = ['PHI', 'MIL', 'CHI', 'CLE', 'BOS', 'LAC', 'MEM', 'ATL', 'MIA', 'CHA'];

console.log("Searching for team names...");
for (const team of teamsToFind) {
    let offsets = findString(team, 'utf8');
    if (offsets.length > 0) console.log(`[UTF-8] '${team}' at: ${offsets.join(', ')}`);

    offsets = findString(team, 'utf16le');
    if (offsets.length > 0) console.log(`[UTF-16LE] '${team}' at: ${offsets.join(', ')}`);
}

for (const abbr of abbreviations) {
    let offsets = findString(abbr, 'utf8');
    if (offsets.length > 0) console.log(`[UTF-8] '${abbr}' at: ${offsets.join(', ')}`);

    offsets = findString(abbr, 'utf16le');
    if (offsets.length > 0) console.log(`[UTF-16LE] '${abbr}' at: ${offsets.join(', ')}`);
}
