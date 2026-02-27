const fs = require('fs');
const path = require('path');

const dllPath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'Parsers.dll');
const buffer = fs.readFileSync(dllPath);

let strings = [];
let currentStr = "";

for (let i = 0; i < buffer.length; i++) {
    const charCode = buffer[i];
    if (charCode >= 32 && charCode <= 126) {
        currentStr += String.fromCharCode(charCode);
    } else {
        if (currentStr.length >= 6) {
            strings.push(currentStr);
        }
        currentStr = "";
    }
}

// Check UTF-16 strings too
for (let i = 0; i < buffer.length - 1; i += 2) {
    const charCode = buffer[i];
    const highByte = buffer[i+1];
    if (highByte === 0 && charCode >= 32 && charCode <= 126) {
        currentStr += String.fromCharCode(charCode);
    } else {
        if (currentStr.length >= 6) {
            strings.push(currentStr);
        }
        currentStr = "";
    }
}

const outPath = path.join(__dirname, 'parsers_strings.txt');
fs.writeFileSync(outPath, strings.join('\n'));
console.log(`Extracted ${strings.length} strings from Parsers.dll`);
