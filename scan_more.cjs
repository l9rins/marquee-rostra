const fs = require('fs');
const lines = fs.readFileSync('tutorial_utf8.txt', 'utf8').split('\n');
const targets = [
    'TeamID1 :', 'TeamID2 :', 'Number :', 'SecondPos :', 'Hand :', 'CollegeID :',
    'DraftYear :', 'DraftRound :', 'DraftPos :', 'IsFA :', 'Fatigue :', 'Morale :',
    'InjDaysLeft :', 'InjType :', 'Personality :', 'PlayStyle :', 'PlayType1 :',
    'PlayType2 :', 'PlayType3 :', 'PlayType4 :', 'DunkHand :'
];

for (let i = 0; i < lines.length; i++) {
    for (const t of targets) {
        if (lines[i].includes(t)) {
            console.log(lines[i].trim());
            for (let j = 1; j <= 4; j++) {
                if (i + j < lines.length && lines[i + j].trim().length > 0) {
                    console.log('  ' + lines[i + j].trim());
                }
            }
            console.log('---');
        }
    }
}
