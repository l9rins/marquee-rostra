// ============================================================================
// WasmEngine.ts — Emscripten Wasm engine with zero-copy memory management
// ============================================================================
// Wraps the compiled C++ RosterEditor via Embind bindings.
// Uses Module._malloc / HEAPU8.set() for zero-copy file upload.
// ============================================================================

import type { IRosterEngine, PlayerData, RatingField } from './RosterEngine';
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
            module._free(ptr);
            throw err;
        }

        return new WasmEngine(module, editor, ptr, fileBuffer.byteLength);
    }

    /**
     * Load the Emscripten module by fetching the compiled JS glue from public/.
     * Uses globalThis to retrieve the factory function set by the Emscripten output.
     */
    private static async loadEmscriptenModule(): Promise<RosterEditorModule> {
        // Check if already loaded
        const existing = (globalThis as Record<string, unknown>)['RosterEditorModule'];
        if (typeof existing === 'function') {
            return (existing as (config?: Record<string, unknown>) => Promise<RosterEditorModule>)();
        }

        // Inject the script tag
        await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/roster_editor.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Wasm module not found at /roster_editor.js'));
            document.head.appendChild(script);
        });

        const factory = (globalThis as Record<string, unknown>)['RosterEditorModule'];
        if (typeof factory !== 'function') {
            throw new Error('RosterEditorModule factory not found after script load');
        }

        return (factory as (config?: Record<string, unknown>) => Promise<RosterEditorModule>)();
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
        // Free the heap memory allocated for the file buffer
        if (this.heapPtr !== 0) {
            this.module._free(this.heapPtr);
            this.heapPtr = 0;
        }
    }
}
