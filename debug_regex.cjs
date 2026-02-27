const fs = require('fs');
const tutorial = fs.readFileSync('tutorial_utf8.txt', 'utf8');

let startIdx = tutorial.lastIndexOf("GHdbndLg");
let maxLen = 1500;
let text = tutorial.substring(startIdx, startIdx + maxLen);
let nextFieldIdx = text.indexOf("GUndrshrt");
if (nextFieldIdx > 0) {
    text = text.substring(0, nextFieldIdx);
}

console.log("TEXT STRING DUMP:");
console.log(JSON.stringify(text));

console.log("\\nREGEX TEST 1 (/\d+/g):");
const match1 = [...text.matchAll(/\\d+/g)];
console.log(match1.map(m => m[0]));

console.log("\\nREGEX TEST 2 (/[0-9]/g):");
const match2 = [...text.matchAll(/[0-9]/g)];
console.log(match2.map(m => m[0]));

console.log("\\nCHAR CODES:");
for (let i = text.indexOf('Enumerable'); i < text.indexOf('Enumerable') + 50 && i < text.length; i++) {
    console.log(`Char: ${text[i]} | Code: ${text.charCodeAt(i)}`);
}
