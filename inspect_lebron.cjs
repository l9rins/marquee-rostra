const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const base = 139378;

let fnPtr = buffer.readUInt32LE(base + 52);
let lnPtr = buffer.readUInt32LE(base + 56);

console.log("LeBron James Root (139378):");
console.log(`First Name Pointer Base + 52: ${fnPtr}`);
console.log(`Last Name Pointer Base + 56: ${lnPtr}`);

if (fnPtr > 0 && fnPtr < buffer.length) {
    let fnStr = "";
    for (let i = fnPtr; i < fnPtr + 20; i++) {
        fnStr += String.fromCharCode(buffer[i]);
    }
    console.log(`String at fnPtr: ${fnStr}`);
}

if (lnPtr > 0 && lnPtr < buffer.length) {
    let lnStr = "";
    for (let i = lnPtr; i < lnPtr + 20; i++) {
        lnStr += String.fromCharCode(buffer[i]);
    }
    console.log(`String at lnPtr: ${lnStr}`);
}
