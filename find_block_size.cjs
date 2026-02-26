const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');
const buffer = fs.readFileSync(filePath);

function findPattern(byte1, byte2) {
    const offsets = [];
    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === byte1 && buffer[i + 1] === byte2) {
            offsets.push(i);
        }
    }
    return offsets;
}

const lebron = findPattern(0xF5, 0x03);
const kd = findPattern(0x83, 0x05);
const kobe = findPattern(0xC3, 0x00);

const allOffsets = [...lebron, ...kd, ...kobe].sort((a, b) => a - b);
const distanceCounts = {};

for (let i = 0; i < allOffsets.length; i++) {
    for (let j = i + 1; j < allOffsets.length; j++) {
        const dist = allOffsets[j] - allOffsets[i];
        if (dist > 50 && dist < 5000) {
            if (!distanceCounts[dist]) distanceCounts[dist] = 0;
            distanceCounts[dist]++;
        }
    }
}

// Find top 10 most common distances
const sortedDistances = Object.entries(distanceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

console.log("Top 10 most common distances between identified CFIDs:");
for (const [dist, count] of sortedDistances) {
    console.log(`Distance: ${dist} bytes, Count: ${count}`);
}

// See if the distances are multiples of some base size
const topDistances = sortedDistances.map(d => parseInt(d[0]));
if (topDistances.length > 0) {
    console.log(`Smallest common distance: ${topDistances[topDistances.length - 1]}`);
    const minD = Math.min(...topDistances);
    console.log(`Minimum top distance: ${minD}`);
}
