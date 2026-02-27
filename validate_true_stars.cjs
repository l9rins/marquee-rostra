const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

const RATING_OFFSETS = [
    409, 410, 411, 424, 423, 412, 425, 413, 414, 415,
    416, 417, 418, 419, 420, 421, 422, 426, 428, 429,
    430, 431, 432, 433, 434, 435, 436, 437, 438, 439,
    440, 441, 442, 443, 444, 427, 445, 446, 447, 448,
    449, 450, 451
];

function rawToDisplay(raw) {
    return Math.floor(raw / 3) + 25;
}

function isValidRatingArray(base) {
    let zeros = 0;
    let maxed = 0;
    let invalids = 0;
    
    for (let off of RATING_OFFSETS) {
        if (base + off >= buffer.length) return false;
        let raw = buffer[base + off];
        let disp = rawToDisplay(raw);
        
        if (disp < 10) invalids++;
        if (disp > 115) invalids++; // Ratings max out around 99, 110 at extreme edges
        if (disp === 25) zeros++;
        if (disp >= 99) maxed++;
    }
    
    // A real player shouldn't have 40 invalids, or 40 zeros, or 30 maxed ratings.
    if (invalids > 5 || zeros > 15 || maxed > 20) return false;
    return true;
}

console.log("Locating true authentic stars using Rating Signature cross-validation...");

const targetStars = [
    {cfid: 1015, name: "Dwyane Wade"},
    {cfid: 633, name: "Ray Allen"},
    {cfid: 1611, name: "Stephen Curry"},
    {cfid: 1014, name: "Chris Bosh"}
];

for (let offset = 0; offset < buffer.length - 1000; offset++) {
    let cfid = buffer.readUInt16LE(offset + 28);
    for (let target of targetStars) {
        if (cfid === target.cfid) {
            if (isValidRatingArray(offset)) {
                console.log(`[AUTHENTICATED] ${target.name} found at True Offset: ${offset}`);
                // Print a few ratings to prove it's a basketball player
                let r1 = rawToDisplay(buffer[offset + 409]); // Layup or Close
                let r2 = rawToDisplay(buffer[offset + 411]); // Med/3PT
                let over = rawToDisplay(buffer[offset + RATING_OFFSETS[41]]); // Overall
                console.log(`  Ratings Preview: ${r1}, ${r2}, OVR: ${over}`);
            }
        }
    }
}
