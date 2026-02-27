// ============================================================================
// JsFallbackEngine.ts — Pure-JS .ROS parser (no Wasm/Emscripten required)
// ============================================================================
// This mirrors the logic in RosterEditor.cpp but runs entirely in JavaScript.
// Used as a fallback when Wasm fails to load.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField, TendencyField, GearField } from './RosterEngine';
import { POSITION_NAMES, RATING_DEFS, TENDENCY_DEFS, ANIMATION_DEFS } from './RosterEngine';

// ============================================================================
// Constants — must match RosterEditor.cpp
// ============================================================================

const CFID_OFFSET = 28;
const FIRST_NAME_OFFSET = 52;
const LAST_NAME_OFFSET = 56;
const POSITION_OFFSET = 60;
const DEFAULT_RECORD_SIZE = 1023;

// Rating byte offsets — empirical 2K14 shifts targeting Byte 409
const RATING_OFFSETS = [
    409, 410, 411, 424, 423, 412, 425, 413, 414, 415,
    416, 417, 418, 419, 420, 421, 422, 426, 428, 429,
    430, 431, 432, 433, 434, 435, 436, 437, 438, 439,
    440, 441, 442, 443, 444, 427, 445, 446, 447, 448,
    449, 450, 451
];

// Tendency bit-packed layout
const TENDENCY_BASE_BYTE = 144;
const TENDENCY_BASE_BIT = 3;

// Gear layout
const GEAR_BASE_BYTE = 129;
const GEAR_BASE_BIT = 7;

const GEAR_LAYOUT: Record<GearField, { bitOffset: number; bitWidth: number }> = {
    gearAccessoryFlag: { bitOffset: 0, bitWidth: 1 },
    gearElbowPad: { bitOffset: 17, bitWidth: 3 },
    gearWristBand: { bitOffset: 20, bitWidth: 3 },
    gearHeadband: { bitOffset: 23, bitWidth: 4 },
    gearSocks: { bitOffset: 65, bitWidth: 4 },
};

// Animations
const ANIMATION_BASE_BYTE = 193;

// Sig skills: 5 × 6 bits at record + 14 bytes + 3 bits
const SIG_SKILL_BASE_BYTE = 14;
const SIG_SKILL_BASE_BIT = 3;

// Hot zones: 14 × 2 bits after tendencies
const HOT_ZONE_BASE_BITS = TENDENCY_BASE_BYTE * 8 + TENDENCY_BASE_BIT + 58 * 8;

// ============================================================================
// Conversion helpers
// ============================================================================

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

    private readBitsAt(absBase: number, byteOff: number, bitOff: number, count: number): number {
        let pos = absBase + byteOff;
        let bitPos = bitOff;
        let result = 0;
        for (let i = 0; i < count; i++) {
            if (pos >= this.buffer.length) break;
            const bit = (this.buffer[pos] >> (7 - bitPos)) & 1;
            result = (result << 1) | bit;
            bitPos++;
            if (bitPos >= 8) { bitPos = 0; pos++; }
        }
        return result;
    }

    private writeBitsAt(absBase: number, byteOff: number, bitOff: number, count: number, value: number): void {
        let pos = absBase + byteOff;
        let bitPos = bitOff;
        for (let i = count - 1; i >= 0; i--) {
            if (pos >= this.buffer.length) break;
            const bit = (value >> i) & 1;
            if (bit) {
                this.buffer[pos] |= (1 << (7 - bitPos));
            } else {
                this.buffer[pos] &= ~(1 << (7 - bitPos));
            }
            bitPos++;
            if (bitPos >= 8) { bitPos = 0; pos++; }
        }
    }

    // -- Table discovery ------------------------------------------------------

    private discoverPlayerTable(): void {
        const view = new DataView(this.buffer.buffer);
        let found = false;
        let candidateOffset = 0;

        // Scan forward from the beginning of the buffer
        for (let offset = 0; offset < this.buffer.length - DEFAULT_RECORD_SIZE * 3; offset += 4) {
            const cfidOff1 = offset + CFID_OFFSET;
            const cfidOff2 = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
            const cfidOff3 = offset + (DEFAULT_RECORD_SIZE * 2) + CFID_OFFSET;

            if (cfidOff3 + 1 >= this.buffer.length) break;

            const cfid1 = view.getUint16(cfidOff1, true);
            const cfid2 = view.getUint16(cfidOff2, true);
            const cfid3 = view.getUint16(cfidOff3, true);

            // Heuristic: valid CFIDs are typically in range 0–10000.
            // Allow Index 0 to be exactly 0 (Null Player).
            if ((cfid1 === 0 || (cfid1 > 0 && cfid1 < 10000)) &&
                (cfid2 > 0 && cfid2 < 10000) &&
                (cfid3 > 0 && cfid3 < 10000)) {
                candidateOffset = offset;
                found = true;
                break;
            }
        }

        if (found) {
            this.playerTableOffset = candidateOffset;
            let count = 0;
            // Count valid players
            for (let offset = candidateOffset; 
                 offset + DEFAULT_RECORD_SIZE <= this.buffer.length && count < 1500; 
                 offset += DEFAULT_RECORD_SIZE) {
                
                const cfidOff = offset + CFID_OFFSET;
                if (cfidOff + 1 >= this.buffer.length) break;
                const cfid = view.getUint16(cfidOff, true);

                if (cfid === 0 && count > 10) {
                    const nextOff = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
                    if (nextOff + 1 < this.buffer.length) {
                         const nextCfid = view.getUint16(nextOff, true);
                         if (nextCfid === 0) break; // End of table
                    }
                }
                count++;
            }
            this.playerCount_ = count;
        } else {
            this.playerCount_ = 0;
        }
    }

    // -- Record accessors -----------------------------------------------------

    private recordStart(index: number): number {
        return this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
    }

    getPlayerCount(): number {
        return this.playerCount_;
    }

    getPlayer(index: number): PlayerData {
        const rec = this.recordStart(index);

        // All 43 ratings
        const ratings: number[] = [];
        for (let i = 0; i < RATING_DEFS.length; i++) {
            const off = rec + RATING_OFFSETS[i];
            ratings.push(off < this.buffer.length ? rawToDisplay(this.buffer[off]) : 25);
        }

        // All 58 tendencies
        const tendencies: number[] = [];
        for (let i = 0; i < TENDENCY_DEFS.length; i++) {
            const totalBits = TENDENCY_BASE_BYTE * 8 + TENDENCY_BASE_BIT + i * 8;
            const bo = Math.floor(totalBits / 8);
            const bi = totalBits % 8;
            tendencies.push(this.readBitsAt(rec, bo, bi, 8) & 127);
        }

        // 14 hot zones
        const hotZones: number[] = [];
        for (let i = 0; i < 14; i++) {
            const totalBits = HOT_ZONE_BASE_BITS + i * 2;
            const bo = Math.floor(totalBits / 8);
            const bi = totalBits % 8;
            hotZones.push(this.readBitsAt(rec, bo, bi, 2));
        }

        // 5 sig skills
        const sigSkills: number[] = [];
        for (let i = 0; i < 5; i++) {
            const totalBits = SIG_SKILL_BASE_BYTE * 8 + SIG_SKILL_BASE_BIT + i * 6;
            const bo = Math.floor(totalBits / 8);
            const bi = totalBits % 8;
            sigSkills.push(this.readBitsAt(rec, bo, bi, 6));
        }

        // 40 animations
        const animations: number[] = [];
        for (let i = 0; i < ANIMATION_DEFS.length; i++) {
            const absOff = rec + ANIMATION_BASE_BYTE + i;
            animations.push(absOff < this.buffer.length ? this.buffer[absOff] : 0);
        }

        // Name reading
        const readName = (offset: number): string => {
            const absOff = rec + offset;
            if (absOff + 3 >= this.buffer.length) return '';
            const namePtr = this.readU16LE(absOff) | (this.readU16LE(absOff + 2) << 16);
            if (namePtr >= this.buffer.length) return '';
            let name = '';
            for (let i = namePtr; i < this.buffer.length && i < namePtr + 64; i++) {
                if (this.buffer[i] === 0) break;
                name += String.fromCharCode(this.buffer[i]);
            }
            return name;
        };

        const posOff = rec + POSITION_OFFSET;
        const posVal = posOff < this.buffer.length ? this.buffer[posOff] : 0;

        return {
            index,
            cfid: this.readU16LE(rec + CFID_OFFSET),
            firstName: readName(FIRST_NAME_OFFSET) || 'Player',
            lastName: readName(LAST_NAME_OFFSET) || `#${index}`,
            position: POSITION_NAMES[posVal] ?? `${posVal}`,

            // Data-driven arrays
            ratings,
            tendencies,
            hotZones,
            sigSkills,
            animations,

            // Legacy named fields
            threePointRating: ratings[4],
            midRangeRating: ratings[3],
            dunkRating: ratings[6],
            speedRating: ratings[35],
            overallRating: ratings[0],

            tendencyStepbackShot3Pt: tendencies[0],
            tendencyDrivingLayup: tendencies[1],
            tendencyStandingDunk: tendencies[2],
            tendencyDrivingDunk: tendencies[3],
            tendencyPostHook: tendencies[4],

            gearAccessoryFlag: this.readGearAt(rec, 'gearAccessoryFlag'),
            gearElbowPad: this.readGearAt(rec, 'gearElbowPad'),
            gearWristBand: this.readGearAt(rec, 'gearWristBand'),
            gearHeadband: this.readGearAt(rec, 'gearHeadband'),
            gearSocks: this.readGearAt(rec, 'gearSocks'),
        };
    }

    // -- Gear helpers ---------------------------------------------------------

    private readGearAt(rec: number, field: GearField): number {
        const layout = GEAR_LAYOUT[field];
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + layout.bitOffset;
        return this.readBitsAt(rec, Math.floor(totalBits / 8), totalBits % 8, layout.bitWidth);
    }

    private writeGearAt(rec: number, field: GearField, value: number): void {
        const layout = GEAR_LAYOUT[field];
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + layout.bitOffset;
        this.writeBitsAt(rec, Math.floor(totalBits / 8), totalBits % 8, layout.bitWidth, value);
    }

    // -- Setters --------------------------------------------------------------

    setCFID(index: number, cfid: number): void {
        this.writeU16LE(this.recordStart(index) + CFID_OFFSET, cfid);
    }

    setRatingById(index: number, ratingId: number, displayValue: number): void {
        if (ratingId < 0 || ratingId >= RATING_OFFSETS.length) return;
        const off = this.recordStart(index) + RATING_OFFSETS[ratingId];
        if (off < this.buffer.length) {
            this.buffer[off] = displayToRaw(displayValue);
        }
    }

    setTendencyById(index: number, tendencyId: number, value: number): void {
        if (tendencyId < 0 || tendencyId >= 58) return;
        const rec = this.recordStart(index);
        const totalBits = TENDENCY_BASE_BYTE * 8 + TENDENCY_BASE_BIT + tendencyId * 8;
        const bo = Math.floor(totalBits / 8);
        const bi = totalBits % 8;
        const current = this.readBitsAt(rec, bo, bi, 8);
        const msb = current & 128;
        this.writeBitsAt(rec, bo, bi, 8, (value & 127) | msb);
    }

    setHotZone(index: number, zoneId: number, value: number): void {
        if (zoneId < 0 || zoneId >= 14) return;
        const rec = this.recordStart(index);
        const totalBits = HOT_ZONE_BASE_BITS + zoneId * 2;
        this.writeBitsAt(rec, Math.floor(totalBits / 8), totalBits % 8, 2, value & 0x3);
    }

    setSigSkill(index: number, slot: number, value: number): void {
        if (slot < 0 || slot >= 5) return;
        const rec = this.recordStart(index);
        const totalBits = SIG_SKILL_BASE_BYTE * 8 + SIG_SKILL_BASE_BIT + slot * 6;
        this.writeBitsAt(rec, Math.floor(totalBits / 8), totalBits % 8, 6, value & 0x3F);
    }

    setAnimationById(index: number, animationId: number, value: number): void {
        if (animationId < 0 || animationId >= ANIMATION_DEFS.length) return;
        const rec = this.recordStart(index);
        const absOff = rec + ANIMATION_BASE_BYTE + animationId;
        if (absOff < this.buffer.length) {
            this.buffer[absOff] = value & 0xFF;
        }
    }

    // -- Legacy named setters (backward compat) --------------------------------

    setRating(index: number, field: RatingField, value: number): void {
        const idMap: Record<RatingField, number> = {
            overallRating: 0, threePointRating: 4, midRangeRating: 3, dunkRating: 6, speedRating: 35,
        };
        this.setRatingById(index, idMap[field], value);
    }

    setTendency(index: number, field: TendencyField, value: number): void {
        const idMap: Record<TendencyField, number> = {
            tendencyStepbackShot3Pt: 0, tendencyDrivingLayup: 1, tendencyStandingDunk: 2,
            tendencyDrivingDunk: 3, tendencyPostHook: 4,
        };
        this.setTendencyById(index, idMap[field], value);
    }

    setGear(index: number, field: GearField, value: number): void {
        this.writeGearAt(this.recordStart(index), field, value);
    }

    // -- File I/O -------------------------------------------------------------

    saveAndRecalculateChecksum(): Uint8Array {
        // Simple CRC32 recalculation
        const payload = this.buffer.subarray(4);
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < payload.length; i++) {
            crc ^= payload[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
            }
        }
        crc = (crc ^ 0xFFFFFFFF) >>> 0;

        // Write CRC as little-endian at offset 0
        this.buffer[0] = crc & 0xFF;
        this.buffer[1] = (crc >> 8) & 0xFF;
        this.buffer[2] = (crc >> 16) & 0xFF;
        this.buffer[3] = (crc >> 24) & 0xFF;

        return new Uint8Array(this.buffer);
    }

    getFileSize(): number {
        return this.buffer.length;
    }

    dispose(): void {
        // Nothing to free in JS land
    }
}
