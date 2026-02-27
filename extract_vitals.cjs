const fs = require('fs');
const lines = fs.readFileSync('tutorial_utf8.txt', 'utf8').split('\n');
const targets = ['BirthDay :', 'BirthMonth :', 'BirthYear :', 'Height :', 'Weight :', 'YearsPro :', 'Pos :', 'SecondPos :'];

for (let i = 0; i < lines.length; i++) {
    for (const t of targets) {
        if (lines[i].includes(t)) {
            console.log(lines[i]);
            // Print the next 5 lines to get the max value / size info
            for (let j = 1; j <= 5; j++) {
                if (i + j < lines.length && lines[i+j].trim().length > 0) {
                    console.log('  ' + lines[i+j]);
                }
            }
            console.log('---');
        }
    }
}
