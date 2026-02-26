// ============================================================================
// RosterEngine.ts — Common interface for both Wasm and JS engines
// ============================================================================

/** Position index → display string */
export const POSITION_NAMES: Record<number, string> = {
    0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C',
};

/** Field names used in the editable grid */
export type RatingField =
    | 'threePointRating'
    | 'midRangeRating'
    | 'dunkRating'
    | 'speedRating'
    | 'overallRating';

export type EditableField = 'cfid' | RatingField;

/** Tendency field names (vertical slice — first 5 of 69) */
export type TendencyField =
    | 'tendencyStepbackShot3Pt'
    | 'tendencyDrivingLayup'
    | 'tendencyStandingDunk'
    | 'tendencyDrivingDunk'
    | 'tendencyPostHook';

/** Gear field names (vertical slice — 5 representative fields) */
export type GearField =
    | 'gearAccessoryFlag'
    | 'gearElbowPad'
    | 'gearWristBand'
    | 'gearHeadband'
    | 'gearSocks';

/** Signature field names */
export type SignatureField =
    | 'sigShotForm'
    | 'sigShotBase';

/** Player data structure shared by both engines */
export interface PlayerData {
    index: number;
    cfid: number;
    firstName: string;
    lastName: string;
    threePointRating: number;
    midRangeRating: number;
    dunkRating: number;
    speedRating: number;
    overallRating: number;
    position: string;
    // -- Tendencies (0–255 raw) --
    tendencyStepbackShot3Pt: number;
    tendencyDrivingLayup: number;
    tendencyStandingDunk: number;
    tendencyDrivingDunk: number;
    tendencyPostHook: number;
    // -- Gear --
    gearAccessoryFlag: number;
    gearElbowPad: number;
    gearWristBand: number;
    gearHeadband: number;
    gearSocks: number;
    // -- Signatures --
    sigShotForm: number;
    sigShotBase: number;
}

/** Engine type identifier */
export type EngineType = 'wasm' | 'js';

/** Common engine interface */
export interface IRosterEngine {
    readonly type: EngineType;

    getPlayerCount(): number;
    getPlayer(index: number): PlayerData;

    setCFID(index: number, cfid: number): void;
    setRating(index: number, field: RatingField, value: number): void;
    setTendency(index: number, field: TendencyField, value: number): void;
    setGear(index: number, field: GearField, value: number): void;
    setSignature(index: number, field: SignatureField, value: number): void;

    saveAndRecalculateChecksum(): Uint8Array;
    getFileSize(): number;

    /** Free any allocated memory (Wasm heap, etc.) */
    dispose(): void;
}
