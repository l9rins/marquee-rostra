const fs = require('fs');
const tutorial = fs.readFileSync('tutorial_utf8.txt', 'utf8');

const fields = [
"GHeadband","GHdbndLg","GUndrshrt","GUndrsCol","GLeftArm","GLArmCol","GLeftElb","GLElbCol",
"GLeftWrst","GLWrstC1","GLWrstC2","GLeftFngr","GLFngrCol","GRghtArm","GRArmCol","GRghtElb",
"GRElbCol","GRghtWrst","GRWrstC1","GRWrstC2","GRghtFngr","GRFngrCol","GPresShrt","GPrsShCol",
"GLeftLeg","GLLegCol","GLeftKnee","GLKneeCol","GLeftAnkl","GLAnklCol","GRghtLeg","GRLegCol",
"GRghtKnee","GRKneeCol","GRghtAnkl","GRAnklCol","GSockLngh","GShsBrLck","GShsBrand","GShsModel1",
"GShsModel2","GShsModel3","GShsModel4","GShsColMod","GShsColHSd","GShsColHTr","GShsColASd","GShsColATr"
];

let bitSum = 0;
const schema = [];
const schemaDump = [];

for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    // Find the definition block at the bottom of the file
    // Search for `field\r\n\r\n(DisplayName`
    let startIdx = tutorial.lastIndexOf(field);
    
    if (startIdx !== -1) {
        let maxLen = 1500;
        let text = tutorial.substring(startIdx, startIdx + maxLen);
        if (i < fields.length - 1) {
            let nextFieldIdx = text.indexOf(fields[i+1]);
            if (nextFieldIdx > 0) {
                text = text.substring(0, nextFieldIdx);
            }
        }
        
        let maxVal = 1;

        let isBool = text.includes('Boolean');
        let isEnum = text.includes('Enumerable:');
        let arr = [];

        if (isBool) {
            maxVal = 1;
        } else if (isEnum) {
            arr = [...text.matchAll(/[0-9]+/g)].map(m => parseInt(m[0], 10));
            if (arr.length > 0) maxVal = Math.max(...arr.filter(n => n < 1000));
        } else if (text.includes('Max:')) {
            const maxMatch = text.match(/Max:\\s*(\\d+)/);
            if (maxMatch) maxVal = parseInt(maxMatch[1], 10);
        }

        let bits = 1;
        while ((1 << bits) - 1 < maxVal) {
            bits++;
        }

        schema.push(`{ name: "${field}", bits: ${bits} }, // Max: ${maxVal.toString().padEnd(3)} Offset: ${bitSum} | isBool: ${isBool} isEnum: ${isEnum} arr: [${arr.join(',')}]`);
        schemaDump.push(`====== ${field} ======\\n${text.substring(0, 300)}`);
        bitSum += bits;
    } else {
        schema.push(`{ name: "${field}", bits: 0 }, // NOT FOUND`);
    }
}

fs.writeFileSync('gear_schema_dump.txt', schemaDump.join('\\n\\n'));

console.log(schema.join('\\n'));
console.log(`\\nTotal Bits: ${bitSum}`);
