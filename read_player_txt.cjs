const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'Text', 'NBA2K14', 'Captions', 'Player.txt');
const buffer = fs.readFileSync(filePath);

// Check if it's UTF-16
let text = "";
if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    text = buffer.toString('utf16le');
} else {
    text = buffer.toString('utf8');
}

// Just print the first 100 lines
const lines = text.split('\n').filter(l => l.trim().length > 0);
for (let i = 0; i < Math.min(100, lines.length); i++) {
    console.log(lines[i].replace(/\r/g, ''));
}
