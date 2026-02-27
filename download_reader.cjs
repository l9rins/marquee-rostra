const https = require('https');
const fs = require('fs');

const url = 'https://raw.githubusercontent.com/leftos/nba-2k13-roster-editor/master/NBA%202K13%20Roster%20Editor/PlayerReader.cs';

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('PlayerReader.cs', data);
        console.log("Downloaded PlayerReader.cs");
        
        // Find offsets like "Tendency" or "Animation" or "Signature"
        const lines = data.split('\n');
        for (const line of lines) {
            if (line.includes('Offset') || line.includes('Bit')) {
                // Just log some lines that might have the layout
                if (line.includes('public static') && line.includes('Offset')) {
                    console.log(line.trim());
                }
            }
        }
    });
}).on('error', err => {
    console.log("Error: " + err.message);
});
