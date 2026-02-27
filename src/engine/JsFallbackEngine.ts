// ============================================================================
// JsFallbackEngine.ts — Pure-JS .ROS parser (no Wasm/Emscripten required)
// ============================================================================
// This mirrors the logic in RosterEditor.cpp but runs entirely in JavaScript.
// Used as a fallback when Wasm fails to load.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField, TendencyField, TeamProperty } from './RosterEngine';
import { POSITION_NAMES, RATING_DEFS, TENDENCY_DEFS, ANIMATION_DEFS, VITAL_TEAM_ID1, VITAL_TEAM_ID2 } from './RosterEngine';

// ============================================================================
// Constants — must match RosterEditor.cpp
// ============================================================================

const CFID_OFFSET = 28;
const FIRST_NAME_OFFSET = 52;
const LAST_NAME_OFFSET = 56;
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
    private playerTableOffset: number = 0;
    private playerCount_: number = 0;

    private teamTableOffset: number = 0;
    private teamCount_: number = 0;
    private teamRecordSize: number = 716;

    constructor(buffer: Uint8Array) {
        // We operate on a copy of the buffer to isolate changes until save
        this.buffer = new Uint8Array(buffer);
        this.discoverPlayerTable();
        this.discoverTeamTable();
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

    private discoverTeamTable(): void {
        this.teamTableOffset = 0;
        this.teamCount_ = 0;
        this.teamRecordSize = 716; // Typically 716 bytes in 2K14

        let foundBucks = false;
        let bucksArrayOffset = 0;

        for (let offset = 0; offset < this.buffer.length - 12; offset += 2) {
            if (this.buffer[offset] === 1 && this.buffer[offset + 1] === 0 &&
                this.buffer[offset + 2] === 9 && this.buffer[offset + 3] === 0 &&
                this.buffer[offset + 4] === 17 && this.buffer[offset + 5] === 0 &&
                this.buffer[offset + 6] === 25 && this.buffer[offset + 7] === 0 &&
                this.buffer[offset + 8] === 33 && this.buffer[offset + 9] === 0) {
                bucksArrayOffset = offset;
                foundBucks = true;
                break;
            }
        }

        if (foundBucks && bucksArrayOffset >= (108 + this.teamRecordSize)) {
            const team1Start = bucksArrayOffset - 108;
            this.teamTableOffset = team1Start - this.teamRecordSize;
            this.teamCount_ = 100; // Expected number of teams
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
            if (i >= 0 && i <= 18) {
                const absOff = rec + 193 + i;
                animations.push(absOff < this.buffer.length ? this.buffer[absOff] : 0);
            } else if (i === 19) {
                animations.push(this.readBitsAt(rec, 274, 2, 4));
            } else if (i >= 20 && i <= 34) {
                const absOff = rec + 178 + (i - 20);
                animations.push(absOff < this.buffer.length ? this.buffer[absOff] : 0);
            } else if (i >= 35 && i <= 39) {
                const absOff = rec + 212 + (i - 35);
                animations.push(absOff < this.buffer.length ? this.buffer[absOff] : 0);
            } else {
                animations.push(0);
            }
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

        const gear: number[] = [];
        for (let i = 0; i < 48; i++) {
            gear.push(this.readGearById(rec, i));
        }

        const vitals: number[] = [];
        for (let i = 0; i < 28; i++) {
            vitals.push(this.getVitalById(index, i));
        }

        return {
            index,
            cfid: this.readU16LE(rec + CFID_OFFSET),
            firstName: readName(FIRST_NAME_OFFSET) || 'Player',
            lastName: readName(LAST_NAME_OFFSET) || `#${index}`,
            position: POSITION_NAMES[vitals[0]] ?? `${vitals[0]}`,

            // Data-driven arrays
            vitals,
            ratings,
            tendencies,
            hotZones,
            sigSkills,
            animations,
            gear,

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

            // Legacy gear
            gearAccessoryFlag: gear[0],
            gearElbowPad: gear[6],
            gearWristBand: gear[8],
            gearHeadband: gear[0],
            gearSocks: gear[36],
        };
    }

    // -- Gear helpers ---------------------------------------------------------

    private getGearDef(id: number) {
        // Must match C++ GEAR_DEFS exactly
        const DEFS = [
            { bo: 0, bw: 1 }, { bo: 1, bw: 3 }, { bo: 4, bw: 2 }, { bo: 6, bw: 2 }, { bo: 8, bw: 3 }, { bo: 11, bw: 2 }, { bo: 13, bw: 3 }, { bo: 16, bw: 2 },
            { bo: 18, bw: 4 }, { bo: 22, bw: 2 }, { bo: 24, bw: 2 }, { bo: 26, bw: 2 }, { bo: 28, bw: 2 }, { bo: 30, bw: 3 }, { bo: 33, bw: 2 }, { bo: 35, bw: 3 },
            { bo: 38, bw: 2 }, { bo: 40, bw: 4 }, { bo: 44, bw: 2 }, { bo: 46, bw: 2 }, { bo: 48, bw: 2 }, { bo: 50, bw: 2 }, { bo: 52, bw: 1 }, { bo: 53, bw: 2 },
            { bo: 55, bw: 3 }, { bo: 58, bw: 2 }, { bo: 60, bw: 2 }, { bo: 62, bw: 2 }, { bo: 64, bw: 2 }, { bo: 66, bw: 2 }, { bo: 68, bw: 3 }, { bo: 71, bw: 2 },
            { bo: 73, bw: 2 }, { bo: 75, bw: 2 }, { bo: 77, bw: 2 }, { bo: 79, bw: 2 }, { bo: 81, bw: 3 }, { bo: 84, bw: 4 }, { bo: 88, bw: 4 }, { bo: 92, bw: 32 },
            { bo: 124, bw: 32 }, { bo: 156, bw: 32 }, { bo: 188, bw: 32 }, { bo: 220, bw: 2 }, { bo: 222, bw: 2 }, { bo: 224, bw: 2 }, { bo: 226, bw: 2 }, { bo: 228, bw: 2 }
        ];
        return DEFS[id];
    }

    private readGearById(recOffset: number, gearId: number): number {
        if (gearId < 0 || gearId >= 48) return 0;
        const def = this.getGearDef(gearId);
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + def.bo;
        const bo = Math.floor(totalBits / 8);
        const bi = totalBits % 8;
        return this.readBitsAt(recOffset, bo, bi, def.bw);
    }

    private writeGearById(recOffset: number, gearId: number, value: number): void {
        if (gearId < 0 || gearId >= 48) return;
        const def = this.getGearDef(gearId);
        const totalBits = GEAR_BASE_BYTE * 8 + GEAR_BASE_BIT + def.bo;
        const bo = Math.floor(totalBits / 8);
        const bi = totalBits % 8;

        let maxVal = 0xFFFFFFFF;
        if (def.bw < 32) maxVal = (1 << def.bw) - 1;
        this.writeBitsAt(recOffset, bo, bi, def.bw, value & maxVal);
    }

    // -- Vitals helpers -------------------------------------------------------

    getVitalById(index: number, id: number): number {
        const start = this.recordStart(index);
        switch (id) {
            case 0: return this.buffer[start + 33];
            case 1: return this.buffer[start + 34];
            case 2: return this.buffer[start + 35];
            case 3: return this.buffer[start + 37];
            case 4: return this.buffer[start + 38];
            case 5: return this.readU16LE(start + 39);
            case 6: return this.buffer[start + 41];
            case 7: return this.buffer[start + 42];
            case 8: return this.buffer[start + 43];
            case 9: return this.readBitsAt(start, 13, 4, 8);
            case 10: return this.readBitsAt(start, 1, 0, 8);
            case 11: return this.readBitsAt(start, 267, 0, 8);
            case 12: return this.readBitsAt(start, 222, 0, 32);
            case 13: return this.readBitsAt(start, 226, 0, 32);
            case 14: return this.readBitsAt(start, 230, 0, 32);
            case 15: return this.readBitsAt(start, 234, 0, 32);
            case 16: return this.readBitsAt(start, 238, 0, 32);
            case 17: return this.readBitsAt(start, 242, 0, 32);
            case 18: return this.readBitsAt(start, 246, 0, 32);
            case 19: return this.readBitsAt(start, 162, 0, 2);
            case 20: return this.readBitsAt(start, 185, 5, 1);
            case 21: return this.readBitsAt(start, 32, 1, 7);
            case 22: return this.readBitsAt(start, 36, 0, 16);
            case 23: return this.readBitsAt(start, 162, 5, 5);
            case 24: return this.readBitsAt(start, 151, 5, 4);
            case 25: return this.readBitsAt(start, 152, 1, 4);
            case 26: return this.readBitsAt(start, 152, 5, 4);
            case 27: return this.readBitsAt(start, 153, 1, 4);
            case 28: return this.readBitsAt(start, 134, 6, 3); // Skin Tone
            case 29: return this.readBitsAt(start, 134, 3, 2); // Body Type
            case 30: return this.readBitsAt(start, 134, 5, 1); // Muscle Tone
            case 31: return this.readBitsAt(start, 135, 1, 6); // Hair Type
            case 32: return this.readBitsAt(start, 135, 7, 4); // Hair Color
            case 33: return this.readBitsAt(start, 136, 3, 3); // Eye Color
            case 34: return this.readBitsAt(start, 136, 6, 4); // Eyebrow
            case 35: return this.readBitsAt(start, 138, 0, 3); // Mustache
            case 36: return this.readBitsAt(start, 138, 3, 4); // Facial Hair Color
            case 37: return this.readBitsAt(start, 138, 7, 4); // Beard
            case 38: return this.readBitsAt(start, 139, 3, 5); // Goatee
            case 39: return this.buffer[start + 44]; // Sec Pos
            case 40: return this.buffer[start + 48]; // Draft Year
            case 41: return this.readBitsAt(start, 49, 0, 4); // Draft Round
            case 42: return this.readBitsAt(start, 49, 4, 6); // Draft Pick
            case 43: return this.buffer[start + 51]; // Draft Team
            case 44: return this.buffer[start + 54]; // Nickname
            case 45: return this.readBitsAt(start, 96, 0, 1); // Play Initiator
            case 46: return this.readBitsAt(start, 96, 1, 1); // Goes to 3PT
            case 47: return this.buffer[start + 60]; // Peak Age Start
            case 48: return this.buffer[start + 61]; // Peak Age End
            case 49: return this.buffer[start + 267]; // Potential
            case 50: return this.buffer[start + 58]; // Loyalty
            case 51: return this.buffer[start + 59]; // Financial
            case 52: return this.buffer[start + 57]; // Play For Winner
            default: return 0;
        }
    }

    setVitalById(index: number, vitalId: number, value: number): void {
        const start = this.recordStart(index);
        switch (vitalId) {
            case 0: this.buffer[start + 33] = value & 0xFF; break;
            case 1: this.buffer[start + 34] = value & 0xFF; break;
            case 2: this.buffer[start + 35] = value & 0xFF; break;
            case 3: this.buffer[start + 37] = value & 0xFF; break;
            case 4: this.buffer[start + 38] = value & 0xFF; break;
            case 5: this.writeU16LE(start + 39, value & 0xFFFF); break;
            case 6: this.buffer[start + 41] = value & 0xFF; break;
            case 7: this.buffer[start + 42] = value & 0xFF; break;
            case 8: this.buffer[start + 43] = value & 0xFF; break;
            case 9: this.writeBitsAt(start, 13, 4, 8, value); break;
            case 10: this.writeBitsAt(start, 1, 0, 8, value); break;
            case 11: this.writeBitsAt(start, 267, 0, 8, value); break;
            case 12: this.writeBitsAt(start, 222, 0, 32, value); break;
            case 13: this.writeBitsAt(start, 226, 0, 32, value); break;
            case 14: this.writeBitsAt(start, 230, 0, 32, value); break;
            case 15: this.writeBitsAt(start, 234, 0, 32, value); break;
            case 16: this.writeBitsAt(start, 238, 0, 32, value); break;
            case 17: this.writeBitsAt(start, 242, 0, 32, value); break;
            case 18: this.writeBitsAt(start, 246, 0, 32, value); break;
            case 19: this.writeBitsAt(start, 162, 0, 2, value); break;
            case 20: this.writeBitsAt(start, 185, 5, 1, value); break;
            case 21: this.writeBitsAt(start, 32, 1, 7, value); break;
            case 22: this.writeBitsAt(start, 36, 0, 16, value); break;
            case 23: this.writeBitsAt(start, 162, 5, 5, value); break;
            case 24: this.writeBitsAt(start, 151, 5, 4, value); break;
            case 25: this.writeBitsAt(start, 152, 1, 4, value); break;
            case 26: this.writeBitsAt(start, 152, 5, 4, value); break;
            case 27: this.writeBitsAt(start, 153, 1, 4, value); break;
            case 28: this.writeBitsAt(start, 134, 6, 3, value); break; // Skin Tone
            case 29: this.writeBitsAt(start, 134, 3, 2, value); break; // Body Type
            case 30: this.writeBitsAt(start, 134, 5, 1, value); break; // Muscle Tone
            case 31: this.writeBitsAt(start, 135, 1, 6, value); break; // Hair Type
            case 32: this.writeBitsAt(start, 135, 7, 4, value); break; // Hair Color
            case 33: this.writeBitsAt(start, 136, 3, 3, value); break; // Eye Color
            case 34: this.writeBitsAt(start, 136, 6, 4, value); break; // Eyebrow
            case 35: this.writeBitsAt(start, 138, 0, 3, value); break; // Mustache
            case 36: this.writeBitsAt(start, 138, 3, 4, value); break; // Facial Hair Color
            case 37: this.writeBitsAt(start, 138, 7, 4, value); break; // Beard
            case 38: this.writeBitsAt(start, 139, 3, 5, value); break;
            case 39: this.buffer[start + 44] = value & 0xFF; break;
            case 40: this.buffer[start + 48] = value & 0xFF; break;
            case 41: this.writeBitsAt(start, 49, 0, 4, value); break;
            case 42: this.writeBitsAt(start, 49, 4, 6, value); break;
            case 43: this.buffer[start + 51] = value & 0xFF; break;
            case 44: this.buffer[start + 54] = value & 0xFF; break;
            case 45: this.writeBitsAt(start, 96, 0, 1, value); break;
            case 46: this.writeBitsAt(start, 96, 1, 1, value); break;
            case 47: this.buffer[start + 60] = value & 0xFF; break; // Peak Age Start
            case 48: this.buffer[start + 61] = value & 0xFF; break; // Peak Age End
            case 49: this.buffer[start + 267] = value & 0xFF; break; // Potential
            case 50: this.buffer[start + 58] = value & 0xFF; break; // Loyalty
            case 51: this.buffer[start + 59] = value & 0xFF; break; // Financial
            case 52: this.buffer[start + 57] = value & 0xFF; break; // Play For Winner
        }
    }

    // -- Team Accessors -------------------------------------------------------

    getTeamCount(): number {
        return this.teamCount_;
    }

    getTeam(index: number): import('./RosterEngine').TeamData {
        if (index < 0 || index >= this.teamCount_) {
            throw new Error(`JsFallbackEngine: team index ${index} out of bounds`);
        }

        const rec = this.teamTableOffset + index * this.teamRecordSize;
        const view = new DataView(this.buffer.buffer);

        // Basic Identifiers
        const teamId = this.buffer[rec];
        const name = this.readString(rec + 33, 32);
        const city = this.readString(rec + 1, 32);
        const abbr = this.readString(rec + 65, 4);

        // Colors
        const color1 = view.getUint32(rec + 40, true);
        const color2 = view.getUint32(rec + 44, true);

        // 15-man active roster (starts at 108 bytes into record)
        const rosterIndices: number[] = [];
        for (let i = 0; i < 15; i++) {
            rosterIndices.push(view.getUint16(rec + 108 + i * 2, true));
        }

        return {
            index,
            teamId,
            name,
            city,
            abbr,
            color1,
            color2,
            rosterIndices
        };
    }

    private readString(offset: number, maxLength: number): string {
        let s = '';
        for (let i = 0; i < maxLength; i++) {
            const charCode = this.buffer[offset + i];
            if (charCode === 0) break;
            s += String.fromCharCode(charCode);
        }
        return s;
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

        if (animationId >= 0 && animationId <= 18) {
            const absOff = rec + 193 + animationId;
            if (absOff < this.buffer.length) this.buffer[absOff] = value & 0xFF;
        } else if (animationId === 19) {
            this.writeBitsAt(rec, 274, 2, 4, value & 0xF);
        } else if (animationId >= 20 && animationId <= 34) {
            const absOff = rec + 178 + (animationId - 20);
            if (absOff < this.buffer.length) this.buffer[absOff] = value & 0xFF;
        } else if (animationId >= 35 && animationId <= 39) {
            const absOff = rec + 212 + (animationId - 35);
            if (absOff < this.buffer.length) this.buffer[absOff] = value & 0xFF;
        }
    }

    setTeamProperty(index: number, property: TeamProperty, value: string | number): void {
        const rec = this.teamTableOffset + index * this.teamRecordSize;
        const view = new DataView(this.buffer.buffer);

        switch (property) {
            case 'name':
                this.writeString(rec + 33, value as string, 32);
                break;
            case 'city':
                this.writeString(rec + 1, value as string, 32);
                break;
            case 'abbr':
                this.writeString(rec + 65, value as string, 4);
                break;
            case 'color1':
                view.setUint32(rec + 40, value as number, true);
                break;
            case 'color2':
                view.setUint32(rec + 44, value as number, true);
                break;
        }
    }

    updateRosterAssignment(playerIndex: number, newTeamIndex: number | null): void {
        const p = this.getPlayer(playerIndex);
        const oldTeamId = p.vitals[VITAL_TEAM_ID1];

        // 1. Remove from old team roster
        if (oldTeamId !== 255) {
            const teamCount = this.getTeamCount();
            const view = new DataView(this.buffer.buffer);
            for (let i = 0; i < teamCount; i++) {
                const teamOffset = this.teamTableOffset + i * this.teamRecordSize;
                const teamId = view.getUint32(teamOffset + 0, true);
                if (teamId === oldTeamId) {
                    // Roster array starts at offset 108
                    for (let slot = 0; slot < 15; slot++) {
                        if (view.getUint16(teamOffset + 108 + slot * 2, true) === playerIndex) {
                            view.setUint16(teamOffset + 108 + slot * 2, 65535, true);
                        }
                    }
                    break;
                }
            }
        }

        // 2. Assign to new team
        if (newTeamIndex !== null) {
            const view = new DataView(this.buffer.buffer);
            const teamOffset = this.teamTableOffset + newTeamIndex * this.teamRecordSize;
            const newTeamId = view.getUint32(teamOffset + 0, true);
            let assigned = false;
            for (let slot = 0; slot < 15; slot++) {
                const existing = view.getUint16(teamOffset + 108 + slot * 2, true);
                if (existing === 65535 || existing === 0) {
                    view.setUint16(teamOffset + 108 + slot * 2, playerIndex, true);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                throw new Error("Target team roster is full (15/15). Release a player first.");
            }

            // Update player's team vitals
            this.setVitalById(playerIndex, VITAL_TEAM_ID1, newTeamId);
            this.setVitalById(playerIndex, VITAL_TEAM_ID2, newTeamId);
        } else {
            // Releasing to free agency (255)
            this.setVitalById(playerIndex, VITAL_TEAM_ID1, 255);
            this.setVitalById(playerIndex, VITAL_TEAM_ID2, 255);
        }
    }

    private writeString(offset: number, str: string, maxLength: number): void {
        for (let i = 0; i < maxLength; i++) {
            this.buffer[offset + i] = i < str.length ? str.charCodeAt(i) : 0;
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

    setGearById(index: number, gearId: number, value: number): void {
        const recOffset = this.recordStart(index);
        this.writeGearById(recOffset, gearId, value);
    }

    setGear(_index: number, _field: any, _value: number): void {
        // Deprecated generic legacy fallback layer
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

    save_and_recalculate_checksum(): void {
        this.saveAndRecalculateChecksum();
    }

    getFileSize(): number {
        return this.buffer.length;
    }

    dispose(): void {
        // Nothing to free in JS land
    }
}

