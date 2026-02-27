const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'Text', 'NBA2K14', 'Captions', 'Player.txt');
const buffer = fs.readFileSync(filePath);

let text = "";
if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    text = buffer.toString('utf16le');
} else {
    text = buffer.toString('utf8');
}

const lines = text.split('\n').filter(l => l.trim().length > 0);

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, '');
    if (line.includes('Shot') || line.includes('Dunk') || line.includes('Tendenc') || line.includes('Pass') || line.includes('Foul')) {
        console.log(`${i}: ${line}`);
    }
}
