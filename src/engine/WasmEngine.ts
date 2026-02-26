// ============================================================================
// WasmEngine.ts — Emscripten Wasm engine with zero-copy memory management
// ============================================================================
// Wraps the compiled C++ RosterEditor via Embind bindings.
// Uses Module._malloc / HEAPU8.set() for zero-copy file upload.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField, TendencyField, GearField, SignatureField } from './RosterEngine';
import { POSITION_NAMES } from './RosterEngine';
import type { RosterEditorModule, WasmRosterEditor } from '../types/wasm';

/** Rating field → C++ getter/setter name suffix */
const RATING_CPP_MAP: Record<RatingField, string> = {
    threePointRating: 'three_point_rating',
    midRangeRating: 'mid_range_rating',
    dunkRating: 'dunk_rating',
    speedRating: 'speed_rating',
    overallRating: 'overall_rating',
};

/** Tendency field → C++ getter/setter name suffix */
const TENDENCY_CPP_MAP: Record<TendencyField, string> = {
    tendencyStepbackShot3Pt: 'tendency_stepback_shot_3pt',
    tendencyDrivingLayup: 'tendency_driving_layup',
    tendencyStandingDunk: 'tendency_standing_dunk',
    tendencyDrivingDunk: 'tendency_driving_dunk',
    tendencyPostHook: 'tendency_post_hook',
};

/** Gear field → C++ getter/setter name suffix */
const GEAR_CPP_MAP: Record<GearField, string> = {
    gearAccessoryFlag: 'gear_accessory_flag',
    gearElbowPad: 'gear_elbow_pad',
    gearWristBand: 'gear_wrist_band',
    gearHeadband: 'gear_headband',
    gearSocks: 'gear_socks',
};

/** Signature field → C++ getter/setter name suffix */
const SIG_CPP_MAP: Record<SignatureField, string> = {
    sigShotForm: 'sig_shot_form',
    sigShotBase: 'sig_shot_base',
};

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

    /**
     * Create a WasmEngine from a raw ArrayBuffer.
     * Performs zero-copy allocation: malloc on Wasm heap → copy bytes → init C++ editor.
     */
    static async create(fileBuffer: ArrayBuffer): Promise<WasmEngine> {
        // Load the Emscripten module from public/ via script tag injection.
        // This avoids Rollup/Vite trying to resolve it at build time.
        const module = await WasmEngine.loadEmscriptenModule();

        // Allocate on the Wasm heap
        const ptr = module._malloc(fileBuffer.byteLength);
        if (ptr === 0) {
            throw new Error('Failed to allocate memory on Wasm heap');
        }

        // Zero-copy: write file bytes directly into Wasm linear memory
        module.HEAPU8.set(new Uint8Array(fileBuffer), ptr);

        // Initialize the C++ RosterEditor
        const editor = new module.RosterEditor();
        try {
            editor.init(ptr, fileBuffer.byteLength);
        } catch (err) {
            // Clean up BOTH the heap and the proxy object on failure
            (editor as unknown as { delete: () => void }).delete();
            module._free(ptr);
            throw err;
        }

        return new WasmEngine(module, editor, ptr, fileBuffer.byteLength);
    }

    private static loadingPromise: Promise<RosterEditorModule> | null = null;

    /**
     * Load the Emscripten module by fetching the compiled JS glue from public/.
     * Uses globalThis to retrieve the factory function set by the Emscripten output.
     * Implements a Promise Lock to prevent duplicate script injections.
     */
    private static async loadEmscriptenModule(): Promise<RosterEditorModule> {
        // 1. Check if already loading/loaded
        if (WasmEngine.loadingPromise) {
            return WasmEngine.loadingPromise;
        }

        // 2. Already defined in global scope?
        const factory = (globalThis as Record<string, unknown>)['RosterEditorModule'];
        if (typeof factory === 'function') {
            return (factory as (config?: Record<string, unknown>) => Promise<RosterEditorModule>)();
        }

        // 3. Start loading and store the promise (the Lock)
        WasmEngine.loadingPromise = (async () => {
            try {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    // Cache busting: append timestamp in dev or every load to ensure freshest C++
                    const timestamp = Date.now();
                    script.src = `/roster_editor.js?t=${timestamp}`;
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
                // Reset lock on failure so we can try again
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
            return {
                index,
                cfid: p.get_cfid(),
                firstName: p.get_first_name() || 'Player',
                lastName: p.get_last_name() || `#${index}`,
                threePointRating: p.get_three_point_rating(),
                midRangeRating: p.get_mid_range_rating(),
                dunkRating: p.get_dunk_rating(),
                speedRating: p.get_speed_rating(),
                overallRating: p.get_overall_rating(),
                position: POSITION_NAMES[p.get_position()] ?? `${p.get_position()}`,
                // Tendencies
                tendencyStepbackShot3Pt: p.get_tendency_stepback_shot_3pt(),
                tendencyDrivingLayup: p.get_tendency_driving_layup(),
                tendencyStandingDunk: p.get_tendency_standing_dunk(),
                tendencyDrivingDunk: p.get_tendency_driving_dunk(),
                tendencyPostHook: p.get_tendency_post_hook(),
                // Gear
                gearAccessoryFlag: p.get_gear_accessory_flag(),
                gearElbowPad: p.get_gear_elbow_pad(),
                gearWristBand: p.get_gear_wrist_band(),
                gearHeadband: p.get_gear_headband(),
                gearSocks: p.get_gear_socks(),
                // Signatures
                sigShotForm: p.get_sig_shot_form(),
                sigShotBase: p.get_sig_shot_base(),
            };
        } finally {
            // Embind objects must be explicitly deleted to prevent leaks
            (p as unknown as { delete: () => void }).delete();
        }
    }

    setCFID(index: number, cfid: number): void {
        const p = this.editor.get_player(index);
        try {
            p.set_cfid(cfid);
        } finally {
            (p as unknown as { delete: () => void }).delete();
        }
    }

    setRating(index: number, field: RatingField, value: number): void {
        const cppName = RATING_CPP_MAP[field];
        if (!cppName) return;

        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') {
                (fn as (v: number) => void).call(p, value);
            }
        } finally {
            (p as unknown as { delete: () => void }).delete();
        }
    }

    setTendency(index: number, field: TendencyField, value: number): void {
        const cppName = TENDENCY_CPP_MAP[field];
        if (!cppName) return;
        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') {
                (fn as (v: number) => void).call(p, value);
            }
        } finally {
            (p as unknown as { delete: () => void }).delete();
        }
    }

    setGear(index: number, field: GearField, value: number): void {
        const cppName = GEAR_CPP_MAP[field];
        if (!cppName) return;
        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') {
                (fn as (v: number) => void).call(p, value);
            }
        } finally {
            (p as unknown as { delete: () => void }).delete();
        }
    }

    setSignature(index: number, field: SignatureField, value: number): void {
        const cppName = SIG_CPP_MAP[field];
        if (!cppName) return;
        const p = this.editor.get_player(index);
        try {
            const setter = `set_${cppName}` as keyof typeof p;
            const fn = p[setter];
            if (typeof fn === 'function') {
                (fn as (v: number) => void).call(p, value);
            }
        } finally {
            (p as unknown as { delete: () => void }).delete();
        }
    }

    saveAndRecalculateChecksum(): Uint8Array {
        // Tell C++ to recalculate and write the CRC32 checksum
        this.editor.save_and_recalculate_checksum();

        // Read the updated bytes back from the Wasm heap
        const ptr = this.editor.get_buffer_ptr();
        const len = this.editor.get_buffer_length();

        // slice() creates a JS-owned copy (safe after free)
        return this.module.HEAPU8.slice(ptr, ptr + len);
    }

    getFileSize(): number {
        return this.bufferLength;
    }

    dispose(): void {
        // 1. Delete the C++ RosterEditor proxy object
        if (this.editor) {
            (this.editor as unknown as { delete: () => void }).delete();
        }

        // 2. Free the heap memory allocated for the file buffer
        if (this.heapPtr !== 0) {
            this.module._free(this.heapPtr);
            this.heapPtr = 0;
        }
    }
}
