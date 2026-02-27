const fs = require('fs');
const path = require('path');

const dllPath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'Parsers.dll');
const buffer = fs.readFileSync(dllPath);

console.log("Dumping context-aware strings from Parsers.dll...");

let strings = [];
let currentStr = "";

for (let i = 0; i < buffer.length; i++) {
    const charCode = buffer[i];
    if (charCode >= 32 && charCode <= 126) {
        currentStr += String.fromCharCode(charCode);
    } else {
        if (currentStr.length >= 4) {
            strings.push(currentStr);
        }
        currentStr = "";
    }
}

// Print lines containing "Tendency", "Offset", "Player", or "Layout" with context
for (let i = 0; i < strings.length; i++) {
    let s = strings[i].toLowerCase();
    if (s.includes('tendency') || s.includes('offset') || s.includes('xml') || s.includes('byte')) {
        // Print the previous 2 strings, the target string, and the next 2 strings
        let ctx = [];
        if (i > 1) ctx.push(strings[i-2]);
        if (i > 0) ctx.push(strings[i-1]);
        ctx.push(`>>>>> ${strings[i]} <<<<<`);
        if (i < strings.length - 1) ctx.push(strings[i+1]);
        if (i < strings.length - 2) ctx.push(strings[i+2]);
        
        console.log(ctx.join(' | '));
    }
}
