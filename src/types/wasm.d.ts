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

  // -- Data-driven (all ratings/tendencies) --
  get_rating_by_id(id: number): number;
  set_rating_by_id(id: number, displayValue: number): void;
  get_tendency_by_id(id: number): number;
  set_tendency_by_id(id: number, value: number): void;
  get_hot_zone(zoneId: number): number;
  set_hot_zone(zoneId: number, value: number): void;
  get_sig_skill(slot: number): number;
  set_sig_skill(slot: number, value: number): void;

  // -- Tendencies (bit-packed) --
  get_tendency_stepback_shot_3pt(): number;
  set_tendency_stepback_shot_3pt(val: number): void;
  get_tendency_driving_layup(): number;
  set_tendency_driving_layup(val: number): void;
  get_tendency_standing_dunk(): number;
  set_tendency_standing_dunk(val: number): void;
  get_tendency_driving_dunk(): number;
  set_tendency_driving_dunk(val: number): void;
  get_tendency_post_hook(): number;
  set_tendency_post_hook(val: number): void;

  // -- Gear (mixed bit-widths) --
  get_gear_accessory_flag(): number;
  set_gear_accessory_flag(val: number): void;
  get_gear_elbow_pad(): number;
  set_gear_elbow_pad(val: number): void;
  get_gear_wrist_band(): number;
  set_gear_wrist_band(val: number): void;
  get_gear_headband(): number;
  set_gear_headband(val: number): void;
  get_gear_socks(): number;
  set_gear_socks(val: number): void;

  // -- Signatures (byte-aligned) --
  get_animation_by_id(id: number): number;
  set_animation_by_id(id: number, val: number): void;

  /** Embind objects must be deleted to prevent memory leaks */
  delete(): void;
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

