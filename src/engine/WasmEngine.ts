// ============================================================================
// WasmEngine.ts — Emscripten Wasm engine with zero-copy memory management
// ============================================================================
// Wraps the compiled C++ RosterEditor via Embind bindings.
// Uses Module._malloc / HEAPU8.set() for zero-copy file upload.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField, TendencyField, TeamProperty } from './RosterEngine';
import { POSITION_NAMES, RATING_DEFS, TENDENCY_DEFS, ANIMATION_DEFS, VITAL_TEAM_ID1, VITAL_TEAM_ID2 } from './RosterEngine';
import { ROSTER_NAMES } from './RosterNames';
import type { RosterEditorModule, WasmRosterEditor } from '../types/wasm';

/** Rating field → C++ getter/setter name suffix (legacy) */
const RATING_CPP_MAP: Record<RatingField, string> = {
    threePointRating: 'three_point_rating',
    midRangeRating: 'mid_range_rating',
    dunkRating: 'dunk_rating',
    speedRating: 'speed_rating',
    overallRating: 'overall_rating',
};

/** Tendency field → C++ getter/setter name suffix (legacy) */
const TENDENCY_CPP_MAP: Record<TendencyField, string> = {
    tendencyStepbackShot3Pt: 'tendency_stepback_shot_3pt',
    tendencyDrivingLayup: 'tendency_driving_layup',
    tendencyStandingDunk: 'tendency_standing_dunk',
    tendencyDrivingDunk: 'tendency_driving_dunk',
    tendencyPostHook: 'tendency_post_hook',
};


/** Helper to safely call a method on an Embind proxy then delete it */
function deleteProxy(proxy: unknown): void {
    (proxy as { delete: () => void }).delete();
}

export class WasmEngine implements IRosterEngine {
    readonly type = 'wasm' as const;

    private module: RosterEditorModule;
    private editor: WasmRosterEditor;
    private heapPtr: number;
    private bufferLength: number;

    constructor(module: RosterEditorModule, editor: WasmRosterEditor, heapPtr: number, bufferLength: number) {
        this.module = module;
        this.editor = editor;
        this.heapPtr = heapPtr;
        this.bufferLength = bufferLength;
    }

    static async create(fileBuffer: ArrayBuffer): Promise<WasmEngine> {
        const module = await WasmEngine.loadEmscriptenModule();
        const ptr = module._malloc(fileBuffer.byteLength);
        if (ptr === 0) throw new Error('Failed to allocate memory on Wasm heap');

        module.HEAPU8.set(new Uint8Array(fileBuffer), ptr);

        const editor = new module.RosterEditor();
        try {
            editor.init(ptr, fileBuffer.byteLength);
        } catch (err) {
            deleteProxy(editor);
            module._free(ptr);
            throw err;
        }

        return new WasmEngine(module, editor, ptr, fileBuffer.byteLength);
    }

    private static loadingPromise: Promise<RosterEditorModule> | null = null;

    private static async loadEmscriptenModule(): Promise<RosterEditorModule> {
        if (WasmEngine.loadingPromise) return WasmEngine.loadingPromise;

        const factory = (globalThis as Record<string, unknown>)['RosterEditorModule'];
        if (typeof factory === 'function') {
            return (factory as (config?: Record<string, unknown>) => Promise<RosterEditorModule>)();
        }

        WasmEngine.loadingPromise = (async () => {
            try {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = `/roster_editor.js?t=${Date.now()}`;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Wasm module not found at /roster_editor.js'));
                    document.head.appendChild(script);
                });

                const loadedFactory = (globalThis as Record<string, unknown>)['RosterEditorModule'];
                if (typeof loadedFactory !== 'function') {
                    throw new Error('RosterEditorModule factory not found after script load');
                }
                return (loadedFactory as (config?: Record<string, unknown>) => Promise<RosterEditorModule>)();
            } catch (err) {
                WasmEngine.loadingPromise = null;
                throw err;
            }
        })();

        return WasmEngine.loadingPromise;
    }

    getPlayerCount(): number {
        return this.editor.get_player_count();
    }

    getPlayer(index: number): PlayerData {
        const p = this.editor.get_player(index);
        try {
            // Extract all 43 ratings via data-driven API
            const ratings: number[] = [];
            for (let i = 0; i < RATING_DEFS.length; i++) {
                ratings.push(p.get_rating_by_id(i));
            }

            // Extract all 58 tendencies via data-driven API
            const tendencies: number[] = [];
            for (let i = 0; i < TENDENCY_DEFS.length; i++) {
                tendencies.push(p.get_tendency_by_id(i));
            }

            // Extract 14 hot zones
            const hotZones: number[] = [];
            for (let i = 0; i < 14; i++) {
                hotZones.push(p.get_hot_zone(i));
            }

            // Extract 5 signature skills
            const sigSkills: number[] = [];
            for (let i = 0; i < 5; i++) {
                sigSkills.push(p.get_sig_skill(i));
            }

            // Extract 40 animations
            const animations: number[] = [];
            for (let i = 0; i < ANIMATION_DEFS.length; i++) {
                animations.push(p.get_animation_by_id(i));
            }

            const gear: number[] = [];
            for (let i = 0; i < 48; i++) {
                gear.push(p.get_gear_by_id(i));
            }

            const vitals: number[] = [];
            for (let i = 0; i < 53; i++) {
                vitals.push(p.get_vital_by_id(i));
            }

            // Intercept Names and translate via Dictionary
            const rawFirstName = p.get_first_name() || '';
            const rawLastName = p.get_last_name() || '';

            const firstId = parseInt(rawFirstName, 10);
            const lastId = parseInt(rawLastName, 10);

            const firstName = !isNaN(firstId) ? (ROSTER_NAMES[firstId] || rawFirstName) : rawFirstName;
            const lastName = !isNaN(lastId) ? (ROSTER_NAMES[lastId] || rawLastName) : rawLastName;

            return {
                index,
                cfid: p.get_cfid(),
                firstName: firstName,
                lastName: lastName,
                position: POSITION_NAMES[vitals[0]] ?? `${vitals[0]}`,

                // Data-driven arrays
                vitals,
                ratings,
                tendencies,
                hotZones,
                sigSkills,
                animations,
                gear,

                // Legacy named fields (backward compat with existing grid)
                threePointRating: ratings[4],   // RAT_SHOT_3PT
                midRangeRating: ratings[3],     // RAT_SHOT_MEDIUM
                dunkRating: ratings[6],         // RAT_DUNK
                speedRating: ratings[35],       // RAT_SPEED
                overallRating: ratings[0],      // RAT_OVERALL

                // Legacy named tendencies
                tendencyStepbackShot3Pt: tendencies[0],
                tendencyDrivingLayup: tendencies[1],
                tendencyStandingDunk: tendencies[2],
                tendencyDrivingDunk: tendencies[3],
                tendencyPostHook: tendencies[4],

                // Gear (vertical slice fallback mapping)
                gearAccessoryFlag: gear[0],
                gearElbowPad: gear[6], // Wait, this depends on GEAR_DEFS order
                gearWristBand: gear[8],
                gearHeadband: gear[0], // GHeadband = 0
                gearSocks: gear[36],   // GSockLngh = 36
            };
        } finally {
            deleteProxy(p);
        }
    }

    setCFID(index: number, cfid: number): void {
        const p = this.editor.get_player(index);
        try { p.set_cfid(cfid); } finally { deleteProxy(p); }
    }

    // -- Data-driven setters (preferred) ------------------------------------

    setRatingById(index: number, ratingId: number, displayValue: number): void {
        const p = this.editor.get_player(index);
        try { p.set_rating_by_id(ratingId, displayValue); } finally { deleteProxy(p); }
    }

    setTendencyById(index: number, tendencyId: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_tendency_by_id(tendencyId, value); } finally { deleteProxy(p); }
    }

    setHotZone(index: number, zoneId: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_hot_zone(zoneId, value); } finally { deleteProxy(p); }
    }

    setSigSkill(index: number, slot: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_sig_skill(slot, value); } finally { deleteProxy(p); }
    }

    setAnimationById(index: number, animationId: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_animation_by_id(animationId, value); } finally { deleteProxy(p); }
    }

    setGearById(index: number, gearId: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_gear_by_id(gearId, value); } finally { deleteProxy(p); }
    }

    setVitalById(index: number, vitalId: number, value: number): void {
        const p = this.editor.get_player(index);
        try { p.set_vital_by_id(vitalId, value); } finally { deleteProxy(p); }
    }

    // -- Team Accessors -----------------------------------------------------

    getTeamCount(): number {
        return this.editor.get_team_count();
    }

    getTeam(index: number): import('./RosterEngine').TeamData {
        const t = this.editor.get_team(index);
        try {
            const rosterIndices: number[] = [];
            for (let i = 0; i < 15; i++) {
                rosterIndices.push(t.get_roster_player_id(i));
            }

            return {
                index,
                teamId: t.get_id(),
                name: t.get_name(),
                city: t.get_city(),
                abbr: t.get_abbr(),
                color1: t.get_color1(),
                color2: t.get_color2(),
                rosterIndices,
            };
        } finally {
            deleteProxy(t);
        }
    }

    setTeamProperty(index: number, property: TeamProperty, value: string | number): void {
        const t = this.editor.get_team(index);
        try {
            if (property === 'name') t.set_name(value as string);
            else if (property === 'city') t.set_city(value as string);
            else if (property === 'abbr') t.set_abbr(value as string);
            else if (property === 'color1') t.set_color1(value as number);
            else if (property === 'color2') t.set_color2(value as number);
        } finally {
            deleteProxy(t);
        }
    }

    updateRosterAssignment(playerIndex: number, newTeamIndex: number | null): void {
        const p = this.editor.get_player(playerIndex);
        let oldTeamId = 255;
        try {
            oldTeamId = p.get_vital_by_id(VITAL_TEAM_ID1);
        } finally {
            deleteProxy(p);
        }

        // 1. Remove from old team roster if it exists
        if (oldTeamId !== 255) {
            const teamCount = this.editor.get_team_count();
            for (let i = 0; i < teamCount; i++) {
                const t = this.editor.get_team(i);
                try {
                    if (t.get_id() === oldTeamId) {
                        for (let slot = 0; slot < 15; slot++) {
                            if (t.get_roster_player_id(slot) === playerIndex) {
                                t.set_roster_player_id(slot, 65535); // Clear slot
                            }
                        }
                        break;
                    }
                } finally {
                    deleteProxy(t);
                }
            }
        }

        // 2. Assign to new team or set free agent
        if (newTeamIndex !== null) {
            const t = this.editor.get_team(newTeamIndex);
            try {
                const newTeamId = t.get_id();
                let assigned = false;
                for (let slot = 0; slot < 15; slot++) {
                    const existing = t.get_roster_player_id(slot);
                    if (existing === 65535 || existing === 0) {
                        t.set_roster_player_id(slot, playerIndex);
                        assigned = true;
                        break;
                    }
                }

                if (!assigned) {
                    throw new Error("Target team roster is full (15/15). Release a player first.");
                }

                // Update player's team vitals
                const player = this.editor.get_player(playerIndex);
                try {
                    player.set_vital_by_id(VITAL_TEAM_ID1, newTeamId);
                    player.set_vital_by_id(VITAL_TEAM_ID2, newTeamId);
                } finally {
                    deleteProxy(player);
                }
            } finally {
                deleteProxy(t);
            }
        } else {
            // Releasing to free agency (255)
            const player = this.editor.get_player(playerIndex);
            try {
                player.set_vital_by_id(VITAL_TEAM_ID1, 255);
                player.set_vital_by_id(VITAL_TEAM_ID2, 255);
            } finally {
                deleteProxy(player);
            }
        }
    }

    save_and_recalculate_checksum(): void {
        this.editor.save_and_recalculate_checksum();
    }

    // -- Legacy named setters (backward compat) -----------------------------

    setRating(index: number, field: RatingField, value: number): void {
        const cppName = RATING_CPP_MAP[field];
        if (!cppName) return;
        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') (fn as (v: number) => void).call(p, value);
        } finally { deleteProxy(p); }
    }

    setTendency(index: number, field: TendencyField, value: number): void {
        const cppName = TENDENCY_CPP_MAP[field];
        if (!cppName) return;
        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') (fn as (v: number) => void).call(p, value);
        } finally { deleteProxy(p); }
    }

    setGear(_index: number, _field: any, _value: number): void {
        // Deprecated, no-op for generic engine calls using legacy names
    }



    // -- File I/O -----------------------------------------------------------

    saveAndRecalculateChecksum(): Uint8Array {
        this.editor.save_and_recalculate_checksum();
        const ptr = this.editor.get_buffer_ptr();
        const len = this.editor.get_buffer_length();
        return this.module.HEAPU8.slice(ptr, ptr + len);
    }

    getFileSize(): number {
        return this.bufferLength;
    }

    dispose(): void {
        if (this.editor) deleteProxy(this.editor);
        if (this.heapPtr !== 0) {
            this.module._free(this.heapPtr);
            this.heapPtr = 0;
        }
    }
}
