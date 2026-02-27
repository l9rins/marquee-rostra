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

console.log("--- TENDENCIES START AROUND LINE 239 ---");
for (let i = 239; i <= 299; i++) {
    // There might be empty lines
    if(lines[i]) console.log(`${i - 239}: ${lines[i].replace(/\r/g, '').split(';')[1]}`);
}
