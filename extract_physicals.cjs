const fs = require('fs');
const tutorial = fs.readFileSync('tutorial_utf8.txt', 'utf8');

const fields = [
    "Height", "Weight", "BirthDay", "BirthMonth", "BirthYear", "YearsPro", "Age", "Pos", "SecondPos", "DraftYear", "DraftRound", "DraftPos", "CollegeID"
];

for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    // RED MC has definitions at the bottom
    let startIdx = tutorial.lastIndexOf("\r\n" + field + "\r\n");
    if (startIdx === -1) {
        startIdx = tutorial.lastIndexOf("\n" + field + "\n");
    }
    
    if (startIdx !== -1) {
        let maxLen = 1000;
        let text = tutorial.substring(startIdx, startIdx + maxLen).trim().split('\n').slice(0, 15).join('\n');
        console.log(`====== ${field} ======`);
        console.log(text);
        console.log('\n');
    } else {
        console.log(`====== ${field} ====== NOT FOUND`);
    }
}
