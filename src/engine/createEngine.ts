// ============================================================================
// createEngine.ts — Factory: try Wasm first, fall back to JS
// ============================================================================

import type { IRosterEngine } from './RosterEngine';
import { JsFallbackEngine } from './JsFallbackEngine';

/**
 * Create the best available engine for the given file buffer.
 *
 * Strategy:
 *   1. Try to load the compiled Wasm module (roster_editor.js in public/)
 *   2. If Wasm is unavailable (not compiled, network error), fall back to JS
 *
 * The caller always receives an IRosterEngine — they don't need to know
 * which engine is active.
 */
export async function createEngine(buffer: ArrayBuffer): Promise<IRosterEngine> {
    // Attempt Wasm engine first
    try {
        const { WasmEngine } = await import('./WasmEngine');
        const engine = await WasmEngine.create(buffer);
        console.log('[Rostra] ⚡ Wasm engine loaded successfully');
        return engine;
    } catch (err) {
        console.warn(
            '[Rostra] Wasm engine unavailable, using JS fallback.',
            err instanceof Error ? err.message : err
        );
    }

    // Fall back to pure-JS engine
    console.log('[Rostra] 🔧 Using JS fallback engine');
    return new JsFallbackEngine(buffer);
}
