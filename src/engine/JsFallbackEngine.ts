// ============================================================================
// JsFallbackEngine.ts — Pure-JS roster engine (mirrors C++ logic)
// ============================================================================
// This engine works without Emscripten / Wasm compilation.
// Used as automatic fallback when the Wasm module is unavailable.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField, TendencyField, GearField, SignatureField } from './RosterEngine';
import { POSITION_NAMES } from './RosterEngine';

// ---- CRC32 (IEEE 802.3, same polynomial as zlib) ---------------------------

function makeCRC32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
}

const CRC32_TABLE = makeCRC32Table();

function crc32(data: Uint8Array, offset: number, length: number): number {
    let crc = 0xFFFFFFFF;
    const end = offset + length;
    for (let i = offset; i < end; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function bswap32(value: number): number {
    return (
        ((value >> 24) & 0xFF) |
        ((value >> 8) & 0xFF00) |
        ((value << 8) & 0xFF0000) |
        ((value << 24) & 0xFF000000)
    ) >>> 0;
}

// ---- Player record layout (mirroring RosterEditor.cpp) ---------------------

const TEAM_TABLE_MARKER = 0x2850EC;
const CFID_OFFSET = 28;
const FIRST_NAME_OFFSET = 52;
const LAST_NAME_OFFSET = 56;
const POSITION_OFFSET = 60;
const DEFAULT_RECORD_SIZE = 128;
const MAX_PLAYERS = 1500;

/** Rating field → byte offset within a player record */
const RATING_OFFSETS: Record<RatingField, number> = {
    threePointRating: 44,
    midRangeRating: 45,
    dunkRating: 46,
    speedRating: 48,
    overallRating: 30,
};

// ---- Bit-packed field layout (mirroring C++ RosterEditor constants) ---------

// Tendencies: base = record + 65 bytes + 6 bits, each 8 bits sequential
const TENDENCY_BASE_BYTE = 65;
const TENDENCY_BASE_BIT = 6;

// Gear: base = record + 129 bytes + 7 bits
const GEAR_BASE_BYTE = 129;
const GEAR_BASE_BIT = 7;

// Signatures: base = record + 193 bytes (byte-aligned)
const SIG_BASE_BYTE = 193;

/** Tendency field → index in the 69-tendency array */
const TENDENCY_INDEX: Record<TendencyField, number> = {
    tendencyStepbackShot3Pt: 0,
    tendencyDrivingLayup: 1,
    tendencyStandingDunk: 2,
    tendencyDrivingDunk: 3,
    tendencyPostHook: 4,
};

/** Gear field → { bitOffset: bits from GEAR_BASE, bitWidth } */
const GEAR_LAYOUT: Record<GearField, { bitOffset: number; bitWidth: number }> = {
    gearAccessoryFlag: { bitOffset: 0, bitWidth: 1 },
    gearElbowPad: { bitOffset: 17, bitWidth: 3 },    // 1 + 16 skip
    gearWristBand: { bitOffset: 20, bitWidth: 3 },    // 17 + 3
    gearHeadband: { bitOffset: 23, bitWidth: 4 },    // 20 + 3
    gearSocks: { bitOffset: 65, bitWidth: 4 },    // sum of all preceding
};

/** Signature field → byte offset from SIG_BASE */
const SIG_OFFSET: Record<SignatureField, number> = {
    sigShotForm: 1,   // 2nd byte (after SigFT)
    sigShotBase: 2,   // 3rd byte
};

function rawToDisplay(raw: number): number {
    return Math.floor(raw / 3) + 25;
}

function displayToRaw(display: number): number {
    return Math.max(0, Math.min(255, (display - 25) * 3));
}

// ============================================================================
// JsFallbackEngine
// ============================================================================

export class JsFallbackEngine implements IRosterEngine {
    readonly type = 'js' as const;

    private buffer: Uint8Array;
    private playerTableOffset = 0;
    private playerCount_ = 0;

    constructor(data: ArrayBuffer) {
        this.buffer = new Uint8Array(data);
        this.discoverPlayerTable();
    }

    // -- Binary helpers -------------------------------------------------------

    private readU16LE(offset: number): number {
        if (offset + 1 >= this.buffer.length) return 0;
        return this.buffer[offset] | (this.buffer[offset + 1] << 8);
    }

    private writeU16LE(offset: number, value: number): void {
        if (offset + 1 >= this.buffer.length) return;
        this.buffer[offset] = value & 0xFF;
        this.buffer[offset + 1] = (value >> 8) & 0xFF;
    }

    private readU32LE(offset: number): number {
        if (offset + 3 >= this.buffer.length) return 0;
        return (
            this.buffer[offset] |
            (this.buffer[offset + 1] << 8) |
            (this.buffer[offset + 2] << 16) |
            (this.buffer[offset + 3] << 24)
        ) >>> 0;
    }

    private readStringAt(ptr: number, maxLen = 64): string {
        if (ptr === 0 || ptr >= this.buffer.length) return '';
        let str = '';
        for (let i = ptr; i < Math.min(ptr + maxLen, this.buffer.length); i++) {
            if (this.buffer[i] === 0) break;
            const ch = this.buffer[i];
            if (ch < 32 || ch > 126) break;
            str += String.fromCharCode(ch);
        }
        return str;
    }

    private readName(absOffset: number, fallback: string): string {
        if (absOffset + 3 >= this.buffer.length) return fallback;
        const ptr = this.readU32LE(absOffset);
        if (ptr > 0 && ptr < this.buffer.length) {
            const name = this.readStringAt(ptr);
            if (name) return name;
        }
        return this.readStringAt(absOffset, 32) || fallback;
    }

    // -- Player table discovery -----------------------------------------------

    private discoverPlayerTable(): void {
        if (this.buffer.length < TEAM_TABLE_MARKER + 64) {
            this.playerTableOffset = 0;
            this.playerCount_ = 0;
            return;
        }

        let found = false;
        for (
            let offset = TEAM_TABLE_MARKER;
            offset < this.buffer.length - DEFAULT_RECORD_SIZE * 2;
            offset += 4
        ) {
            const cfidOff1 = offset + CFID_OFFSET;
            const cfidOff2 = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
            if (cfidOff2 + 1 >= this.buffer.length) break;

            const cfid1 = this.readU16LE(cfidOff1);
            const cfid2 = this.readU16LE(cfidOff2);

            if (cfid1 > 0 && cfid1 < 10000 && cfid2 > 0 && cfid2 < 10000) {
                this.playerTableOffset = offset;
                found = true;
                break;
            }
        }

        if (!found) {
            this.playerTableOffset = 0;
            this.playerCount_ = 0;
            return;
        }

        // Count valid player records
        this.playerCount_ = 0;
        for (
            let offset = this.playerTableOffset;
            offset + DEFAULT_RECORD_SIZE <= this.buffer.length && this.playerCount_ < MAX_PLAYERS;
            offset += DEFAULT_RECORD_SIZE
        ) {
            const cfid = this.readU16LE(offset + CFID_OFFSET);
            if (cfid === 0 && this.playerCount_ > 10) {
                const nextCfid = this.readU16LE(offset + DEFAULT_RECORD_SIZE + CFID_OFFSET);
                if (nextCfid === 0) break;
            }
            this.playerCount_++;
        }
    }

    // -- IRosterEngine implementation -----------------------------------------

    getPlayerCount(): number {
        return this.playerCount_;
    }

    getPlayer(index: number): PlayerData {
        const base = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        const posRaw = this.buffer[base + POSITION_OFFSET] ?? 0;

        return {
            index,
            cfid: this.readU16LE(base + CFID_OFFSET),
            firstName: this.readName(base + FIRST_NAME_OFFSET, 'Player'),
            lastName: this.readName(base + LAST_NAME_OFFSET, `#${index}`),
            threePointRating: rawToDisplay(this.buffer[base + RATING_OFFSETS.threePointRating] ?? 0),
            midRangeRating: rawToDisplay(this.buffer[base + RATING_OFFSETS.midRangeRating] ?? 0),
            dunkRating: rawToDisplay(this.buffer[base + RATING_OFFSETS.dunkRating] ?? 0),
            speedRating: rawToDisplay(this.buffer[base + RATING_OFFSETS.speedRating] ?? 0),
            overallRating: rawToDisplay(this.buffer[base + RATING_OFFSETS.overallRating] ?? 0),
            position: POSITION_NAMES[posRaw] ?? `${posRaw}`,
            // Tendencies
            tendencyStepbackShot3Pt: this.readTendencyAt(base, 0),
            tendencyDrivingLayup: this.readTendencyAt(base, 1),
            tendencyStandingDunk: this.readTendencyAt(base, 2),
            tendencyDrivingDunk: this.readTendencyAt(base, 3),
            tendencyPostHook: this.readTendencyAt(base, 4),
            // Gear
            gearAccessoryFlag: this.readGearAt(base, 'gearAccessoryFlag'),
            gearElbowPad: this.readGearAt(base, 'gearElbowPad'),
            gearWristBand: this.readGearAt(base, 'gearWristBand'),
            gearHeadband: this.readGearAt(base, 'gearHeadband'),
            gearSocks: this.readGearAt(base, 'gearSocks'),
            // Signatures
            sigShotForm: this.buffer[base + SIG_BASE_BYTE + 1] ?? 0,
            sigShotBase: this.buffer[base + SIG_BASE_BYTE + 2] ?? 0,
        };
    }

    setCFID(index: number, cfid: number): void {
        const base = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        this.writeU16LE(base + CFID_OFFSET, cfid);
    }

    setRating(index: number, field: RatingField, value: number): void {
        const offset = RATING_OFFSETS[field];
        if (offset === undefined) return;
        const abs = this.playerTableOffset + index * DEFAULT_RECORD_SIZE + offset;
        if (abs < this.buffer.length) {
            this.buffer[abs] = displayToRaw(value);
        }
    }

    setTendency(index: number, field: TendencyField, value: number): void {
        const tendIdx = TENDENCY_INDEX[field];
        if (tendIdx === undefined) return;
        const base = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        this.writeTendencyAt(base, tendIdx, value);
    }

    setGear(index: number, field: GearField, value: number): void {
        const layout = GEAR_LAYOUT[field];
        if (!layout) return;
        const base = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        this.writeGearAt(base, field, value);
    }

    setSignature(index: number, field: SignatureField, value: number): void {
        const offset = SIG_OFFSET[field];
        if (offset === undefined) return;
        const abs = this.playerTableOffset + index * DEFAULT_RECORD_SIZE + SIG_BASE_BYTE + offset;
        if (abs < this.buffer.length) {
            this.buffer[abs] = value & 0xFF;
        }
    }

    // -- Bit-level helpers (JS equivalent of C++ BitStream) --------------------

    private readBitsAt(absBase: number, byteOff: number, bitOff: number, count: number): number {
        let bytePos = absBase + byteOff;
        let bitPos = bitOff;
        let result = 0;
        for (let i = 0; i < count; i++) {
            if (bytePos >= this.buffer.length) return result;
            const bitIndex = 7 - bitPos;
            const bit = (this.buffer[bytePos] >> bitIndex) & 1;
            result = (result << 1) | bit;
            bitPos++;
            if (bitPos >= 8) { bitPos = 0; bytePos++; }
        }
        return result;
    }

    private writeBitsAt(absBase: number, byteOff: number, bitOff: number, count: number, value: number): void {
        let bytePos = absBase + byteOff;
        let bitPos = bitOff;
        for (let i = count - 1; i >= 0; i--) {
            if (bytePos >= this.buffer.length) return;
            const bit = (value >> i) & 1;
            const bitIndex = 7 - bitPos;
            if (bit) {
                this.buffer[bytePos] |= (1 << bitIndex);
            } else {
                this.buffer[bytePos] &= ~(1 << bitIndex);
            }
            bitPos++;
            if (bitPos >= 8) { bitPos = 0; bytePos++; }
        }
    }

    private readTendencyAt(recordBase: number, tendencyIndex: number): number {
        const totalBits = TENDENCY_BASE_BYTE * 8 + TENDENCY_BASE_BIT + tendencyIndex * 8;
        const byteOff = Math.floor(totalBits / 8);
        const bitOff = totalBits % 8;
        return this.readBitsAt(recordBase, byteOff, bitOff, 8);
    }

    private writeTendencyAt(recordBase: number, tendencyIndex: number, value: number): void {
        const totalBits = TENDENCY_BASE_BYTE * 8 + TENDENCY_BASE_BIT + tendencyIndex * 8;
        const byteOff = Math.floor(totalBits / 8);
        const bitOff = totalBits % 8;
        this.writeBitsAt(recordBase, byteOff, bitOff, 8, value & 0xFF);
    }

    private readGearAt(recordBase: number, field: GearField): number {
        const layout = GEAR_LAYOUT[field];
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + layout.bitOffset;
        const byteOff = Math.floor(totalBits / 8);
        const bitOff = totalBits % 8;
        return this.readBitsAt(recordBase, byteOff, bitOff, layout.bitWidth);
    }

    private writeGearAt(recordBase: number, field: GearField, value: number): void {
        const layout = GEAR_LAYOUT[field];
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + layout.bitOffset;
        const byteOff = Math.floor(totalBits / 8);
        const bitOff = totalBits % 8;
        const mask = (1 << layout.bitWidth) - 1;
        this.writeBitsAt(recordBase, byteOff, bitOff, layout.bitWidth, value & mask);
    }

    saveAndRecalculateChecksum(): Uint8Array {
        const crcValue = crc32(this.buffer, 4, this.buffer.length - 4);
        const swapped = bswap32(crcValue);
        this.buffer[0] = swapped & 0xFF;
        this.buffer[1] = (swapped >> 8) & 0xFF;
        this.buffer[2] = (swapped >> 16) & 0xFF;
        this.buffer[3] = (swapped >> 24) & 0xFF;
        return this.buffer;
    }

    getFileSize(): number {
        return this.buffer.length;
    }

    dispose(): void {
        // No-op — JS GC handles everything
    }
}
