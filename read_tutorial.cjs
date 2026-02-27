const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Mark Lorenz\\Desktop\\rostra\\tutorial.txt', 'utf16le');
if (content) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (/(ShotForm|ShotBase|AShtRlTim|Fadeaway|Dunk|SigSkill)/i.test(lines[i])) {
            console.log(`\n--- Match around Line ${i+1} ---`);
            for(let j = Math.max(0, i-2); j <= Math.min(lines.length-1, i+2); j++) {
                console.log(`[${j+1}] ${lines[j].trim()}`);
            }
        }
    }
}
