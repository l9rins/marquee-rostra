const fs = require('fs');
const path = require('path');

console.log("Generating RosterNames.ts (Decoded from .ROS binary)...");

const rosPath = path.join(__dirname, 'inspiration_repo', 'RED MC', 'NBA Year 2013-14.ROS');

try {
    const buf = fs.readFileSync(rosPath);

    function decodeUTF16LE(buffer, offset) {
        let str = '', pos = offset;
        while (pos + 1 < buffer.length) {
            const ch = buffer.readUInt16LE(pos);
            if (ch === 0) break;
            str += String.fromCharCode(ch);
            pos += 2;
        }
        return { text: str, endPos: pos + 2 };
    }

    const NT_START = 0x25ED3C, NT_END = 0x280000;
    const rosterNames = [];
    let pos = NT_START;

    while (pos < NT_END) {
        // Skip null padding between strings
        while (pos + 1 < NT_END && buf.readUInt16LE(pos) === 0) pos += 2;
        if (pos + 1 >= NT_END) break;

        const { text, endPos } = decodeUTF16LE(buf, pos);
        if (text.length > 0 && text.length < 100) {
            rosterNames.push(text);
            pos = endPos;
        } else {
            pos += 2;
        }
    }

    const tsContent = `// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Decoded from UTF-16 LE table in .ROS file starting at 0x25ED3C

export const ROSTER_NAMES: string[] = [
${rosterNames.map(name => `    ${JSON.stringify(name)},`).join('\n')}
];
`;

    const outPath = path.join(__dirname, 'src', 'engine', 'RosterNames.ts');
    fs.writeFileSync(outPath, tsContent, 'utf8');

    console.log(`✅ Successfully generated src/engine/RosterNames.ts with ${rosterNames.length} real name entries.`);
} catch (e) {
    console.error("❌ Failed to generate RosterNames.ts:", e);
    process.exit(1);
}
