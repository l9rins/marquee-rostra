const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Mark Lorenz\\Desktop\\rostra\\inspiration_repo\\RED MC\\Text\\NBA2K14\\Captions\\Player.txt', 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('Animations'));
console.log(lines.slice(300, 360).join('\n'));
