const buf = Buffer.from([147, 64, 30, 12, 192, 7, 1, 1]);
console.log("Float LE:", buf.readFloatLE(0));
console.log("Float BE:", buf.readFloatBE(0));
console.log("Double LE:", buf.readDoubleLE(0));

// Wait, 147 64 ?
// What is 147 + 64 * 256?
console.log("UInt16 LE:", buf.readUInt16LE(0));
console.log("UInt16 BE:", buf.readUInt16BE(0));

// Let's also look for BirthYear=1984
const lebron = [24, 5, 203, 147, 64, 30, 12, 192, 7, 1, 1, 10];
const lb = Buffer.from(lebron);

for (let i = 0; i < lb.length - 1; i++) {
    const val = lb.readUInt16LE(i);
    // console.log(`offset ${i} UInt16LE = ${val}`);
}

for (let i = 0; i < lb.length - 3; i++) {
    const val = lb.readFloatLE(i);
    if(val > 200 && val < 400) console.log(`offset ${i} FloatLE = ${val}`);
}
