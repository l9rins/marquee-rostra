// ============================================================================
// wasm.d.ts — TypeScript declarations for the Wasm RosterEditor module
// ============================================================================

export interface WasmPlayer {
  get_cfid(): number;
  set_cfid(new_cfid: number): void;

  get_three_point_rating(): number;
  set_three_point_rating(rating: number): void;

  get_mid_range_rating(): number;
  set_mid_range_rating(rating: number): void;

  get_dunk_rating(): number;
  set_dunk_rating(rating: number): void;

  get_speed_rating(): number;
  set_speed_rating(rating: number): void;

  get_overall_rating(): number;
  set_overall_rating(rating: number): void;

  get_first_name(): string;
  get_last_name(): string;

  get_position(): number;
}

export interface WasmRosterEditor {
  init(buffer_ptr: number, buffer_length: number): void;
  get_player_count(): number;
  get_player(index: number): WasmPlayer;
  save_and_recalculate_checksum(): void;
  get_buffer_ptr(): number;
  get_buffer_length(): number;
}

export interface RosterEditorModule {
  RosterEditor: new () => WasmRosterEditor;
  Player: new () => WasmPlayer;

  // Emscripten runtime
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAPU8: Uint8Array;

  // Module lifecycle
  onRuntimeInitialized?: () => void;
  calledRun?: boolean;
}

declare global {
  interface Window {
    RosterEditorModule?: (config?: Record<string, unknown>) => Promise<RosterEditorModule>;
  }
}
