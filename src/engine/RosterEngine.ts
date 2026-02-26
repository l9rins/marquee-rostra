// ============================================================================
// RosterEngine.ts — Common interface for both Wasm and JS engines
// ============================================================================

/** Position index → display string */
export const POSITION_NAMES: Record<number, string> = {
    0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C',
};

// ============================================================================
// Rating definitions — all 43 skills matching RED MC's Player.txt order
// ============================================================================

/** Rating metadata: [id, shortName, displayName, category] */
export interface RatingMeta {
    id: number;
    key: string;       // camelCase key used in PlayerData.ratings[]
    name: string;       // Display name
    category: string;   // Grouping category
}

export const RATING_DEFS: RatingMeta[] = [
    { id: 0, key: 'overall', name: 'Overall', category: 'General' },
    { id: 1, key: 'shotLowPost', name: 'Shot Low Post', category: 'Shooting' },
    { id: 2, key: 'shotClose', name: 'Shot Close', category: 'Shooting' },
    { id: 3, key: 'shotMedium', name: 'Shot Medium', category: 'Shooting' },
    { id: 4, key: 'shot3pt', name: 'Shot 3PT', category: 'Shooting' },
    { id: 5, key: 'shotFT', name: 'Shot Free Throw', category: 'Shooting' },
    { id: 6, key: 'dunk', name: 'Dunk', category: 'Inside' },
    { id: 7, key: 'standingDunk', name: 'Standing Dunk', category: 'Inside' },
    { id: 8, key: 'layup', name: 'Layup', category: 'Inside' },
    { id: 9, key: 'standingLayup', name: 'Standing Layup', category: 'Inside' },
    { id: 10, key: 'spinLayup', name: 'Spin Layup', category: 'Inside' },
    { id: 11, key: 'euroLayup', name: 'Euro Step Layup', category: 'Inside' },
    { id: 12, key: 'hopLayup', name: 'Hop Step Layup', category: 'Inside' },
    { id: 13, key: 'runner', name: 'Runner', category: 'Inside' },
    { id: 14, key: 'stepThrough', name: 'Step Through', category: 'Inside' },
    { id: 15, key: 'shootInTraffic', name: 'Shoot In Traffic', category: 'Shooting' },
    { id: 16, key: 'postFadeaway', name: 'Post Fadeaway', category: 'Post' },
    { id: 17, key: 'postHook', name: 'Post Hook', category: 'Post' },
    { id: 18, key: 'shootOffDribble', name: 'Shoot Off Dribble', category: 'Shooting' },
    { id: 19, key: 'ballHandling', name: 'Ball Handling', category: 'Playmaking' },
    { id: 20, key: 'offHandDribble', name: 'Off Hand Dribble', category: 'Playmaking' },
    { id: 21, key: 'ballSecurity', name: 'Ball Security', category: 'Playmaking' },
    { id: 22, key: 'pass', name: 'Pass', category: 'Playmaking' },
    { id: 23, key: 'block', name: 'Block', category: 'Defense' },
    { id: 24, key: 'steal', name: 'Steal', category: 'Defense' },
    { id: 25, key: 'hands', name: 'Hands', category: 'Defense' },
    { id: 26, key: 'onBallDef', name: 'On-Ball Defense', category: 'Defense' },
    { id: 27, key: 'offRebound', name: 'Off. Rebound', category: 'Rebounding' },
    { id: 28, key: 'defRebound', name: 'Def. Rebound', category: 'Rebounding' },
    { id: 29, key: 'offLowPost', name: 'Off. Low Post', category: 'Post' },
    { id: 30, key: 'defLowPost', name: 'Def. Low Post', category: 'Defense' },
    { id: 31, key: 'offAwareness', name: 'Off. Awareness', category: 'IQ' },
    { id: 32, key: 'defAwareness', name: 'Def. Awareness', category: 'IQ' },
    { id: 33, key: 'consistency', name: 'Consistency', category: 'Mental' },
    { id: 34, key: 'stamina', name: 'Stamina', category: 'Athletic' },
    { id: 35, key: 'speed', name: 'Speed', category: 'Athletic' },
    { id: 36, key: 'quickness', name: 'Quickness', category: 'Athletic' },
    { id: 37, key: 'strength', name: 'Strength', category: 'Athletic' },
    { id: 38, key: 'vertical', name: 'Vertical', category: 'Athletic' },
    { id: 39, key: 'hustle', name: 'Hustle', category: 'Mental' },
    { id: 40, key: 'durability', name: 'Durability', category: 'Mental' },
    { id: 41, key: 'potential', name: 'Potential', category: 'Mental' },
    { id: 42, key: 'emotion', name: 'Emotion', category: 'Mental' },
];

// ============================================================================
// Tendency definitions — all 58, matching RED MC's Tendencies section order
// ============================================================================

export interface TendencyMeta {
    id: number;
    name: string;
    category: string;
}

export const TENDENCY_DEFS: TendencyMeta[] = [
    { id: 0, name: 'Stepback 3PT Shot', category: 'Shooting' },
    { id: 1, name: 'Driving Layup', category: 'Driving' },
    { id: 2, name: 'Standing Dunk', category: 'Driving' },
    { id: 3, name: 'Driving Dunk', category: 'Driving' },
    { id: 4, name: 'Flashy Dunk', category: 'Driving' },
    { id: 5, name: 'Alley-Oop', category: 'Driving' },
    { id: 6, name: 'Putback Dunk', category: 'Driving' },
    { id: 7, name: 'Spin Layup', category: 'Driving' },
    { id: 8, name: 'Hop Step Layup', category: 'Driving' },
    { id: 9, name: 'Euro Step Layup', category: 'Driving' },
    { id: 10, name: 'Floater', category: 'Driving' },
    { id: 11, name: 'Triple Threat Pump Fake', category: 'Shooting' },
    { id: 12, name: 'Triple Threat Jab Step', category: 'Shooting' },
    { id: 13, name: 'Triple Threat Shoot', category: 'Shooting' },
    { id: 14, name: 'Setup With Sizeup', category: 'Dribble Moves' },
    { id: 15, name: 'Setup With Hesitation', category: 'Dribble Moves' },
    { id: 16, name: 'No Setup Dribble', category: 'Dribble Moves' },
    { id: 17, name: 'Drive Right', category: 'Driving' },
    { id: 18, name: 'Drive Left', category: 'Driving' },
    { id: 19, name: 'Spot Up Shot', category: 'Shooting' },
    { id: 20, name: 'Off Screen Shot', category: 'Shooting' },
    { id: 21, name: 'Roll vs Pop', category: 'Shooting' },
    { id: 22, name: 'Use Glass', category: 'Shooting' },
    { id: 23, name: 'Contested Shot Mid', category: 'Shooting' },
    { id: 24, name: 'Contested Shot 3PT', category: 'Shooting' },
    { id: 25, name: 'Stepback Mid', category: 'Shooting' },
    { id: 26, name: 'Spin Jumper', category: 'Shooting' },
    { id: 27, name: 'Transition Pull-Up', category: 'Shooting' },
    { id: 28, name: 'Pull-Up Shot', category: 'Shooting' },
    { id: 29, name: 'Use ISO Plays', category: 'Playmaking' },
    { id: 30, name: 'Use Pick & Roll', category: 'Playmaking' },
    { id: 31, name: 'Crash Boards', category: 'Rebounding' },
    { id: 32, name: 'Dish To Open Man', category: 'Playmaking' },
    { id: 33, name: 'Touch Pass', category: 'Playmaking' },
    { id: 34, name: 'Post Up', category: 'Post Moves' },
    { id: 35, name: 'Aggressive Backdown', category: 'Post Moves' },
    { id: 36, name: 'Leave Post', category: 'Post Moves' },
    { id: 37, name: 'Drop Step', category: 'Post Moves' },
    { id: 38, name: 'Face Up', category: 'Post Moves' },
    { id: 39, name: 'Back Down', category: 'Post Moves' },
    { id: 40, name: 'Post Shots', category: 'Post Moves' },
    { id: 41, name: 'Post Hook', category: 'Post Moves' },
    { id: 42, name: 'Post Fadeaway', category: 'Post Moves' },
    { id: 43, name: 'Shimmy Shot', category: 'Post Moves' },
    { id: 44, name: 'Hop Shot', category: 'Post Moves' },
    { id: 45, name: 'Flashy Passes', category: 'Playmaking' },
    { id: 46, name: 'Throw Alley-Oop', category: 'Playmaking' },
    { id: 47, name: 'Hard Foul', category: 'Defense' },
    { id: 48, name: 'Take Charge', category: 'Defense' },
    { id: 49, name: 'Play Pass Lane', category: 'Defense' },
    { id: 50, name: 'On-Ball Steal', category: 'Defense' },
    { id: 51, name: 'Contest Shot', category: 'Defense' },
    { id: 52, name: 'Commit Foul', category: 'Defense' },
    { id: 53, name: 'Fouling Tendency', category: 'Defense' },
    { id: 54, name: 'Help Defense IQ', category: 'Defense' },
    { id: 55, name: 'Block Shot', category: 'Defense' },
    { id: 56, name: 'Shot Under Basket', category: 'Shooting' },
    { id: 57, name: 'Close Shot', category: 'Shooting' },
];

// ============================================================================
// Hot Zone definitions — 14 court zones
// ============================================================================

export const HOT_ZONE_NAMES = [
    'Under Basket',
    'Close Left', 'Close Top', 'Close Right',
    'Mid Left', 'Mid Mid-Left', 'Mid Top', 'Mid Mid-Right', 'Mid Right',
    '3PT Left', '3PT Mid-Left', '3PT Top', '3PT Mid-Right', '3PT Right',
];

export const HOT_ZONE_VALUES: Record<number, string> = {
    0: 'Cold', 1: 'Neutral', 2: 'Hot', 3: 'Burned',
};

// ============================================================================
// Legacy type aliases (kept for backward compatibility)
// ============================================================================

/** Field names used in the editable grid */
export type RatingField =
    | 'threePointRating'
    | 'midRangeRating'
    | 'dunkRating'
    | 'speedRating'
    | 'overallRating';

export type EditableField = 'cfid' | RatingField;

export type TendencyField =
    | 'tendencyStepbackShot3Pt'
    | 'tendencyDrivingLayup'
    | 'tendencyStandingDunk'
    | 'tendencyDrivingDunk'
    | 'tendencyPostHook';

export type GearField =
    | 'gearAccessoryFlag'
    | 'gearElbowPad'
    | 'gearWristBand'
    | 'gearHeadband'
    | 'gearSocks';

export type SignatureField =
    | 'sigShotForm'
    | 'sigShotBase';

// ============================================================================
// Player data structure
// ============================================================================

export interface PlayerData {
    index: number;
    cfid: number;
    firstName: string;
    lastName: string;
    position: string;

    // -- All 43 ratings (indexed by RatingID) --
    ratings: number[];       // ratings[0] = Overall, ratings[4] = 3PT, etc.

    // -- All 58 tendencies (indexed by tendency ID) --
    tendencies: number[];    // Raw 0-255 values

    // -- 14 Hot Zones (indexed by zone ID) --
    hotZones: number[];      // 0=Cold, 1=Neutral, 2=Hot, 3=Burned

    // -- 5 Signature Skills (indexed by slot) --
    sigSkills: number[];     // 6-bit IDs (0-63)

    // -- Legacy named fields (for backward compat with existing grid/UI) --
    threePointRating: number;
    midRangeRating: number;
    dunkRating: number;
    speedRating: number;
    overallRating: number;

    // -- Gear (vertical slice) --
    gearAccessoryFlag: number;
    gearElbowPad: number;
    gearWristBand: number;
    gearHeadband: number;
    gearSocks: number;

    // -- Signature Animations --
    sigShotForm: number;
    sigShotBase: number;

    // -- Legacy named tendencies (backward compat) --
    tendencyStepbackShot3Pt: number;
    tendencyDrivingLayup: number;
    tendencyStandingDunk: number;
    tendencyDrivingDunk: number;
    tendencyPostHook: number;
}

/** Engine type identifier */
export type EngineType = 'wasm' | 'js';

/** Common engine interface */
export interface IRosterEngine {
    readonly type: EngineType;

    getPlayerCount(): number;
    getPlayer(index: number): PlayerData;

    setCFID(index: number, cfid: number): void;

    // Data-driven (preferred)
    setRatingById(index: number, ratingId: number, displayValue: number): void;
    setTendencyById(index: number, tendencyId: number, value: number): void;
    setHotZone(index: number, zoneId: number, value: number): void;
    setSigSkill(index: number, slot: number, value: number): void;

    // Legacy named setters (backward compat)
    setRating(index: number, field: RatingField, value: number): void;
    setTendency(index: number, field: TendencyField, value: number): void;
    setGear(index: number, field: GearField, value: number): void;
    setSignature(index: number, field: SignatureField, value: number): void;

    saveAndRecalculateChecksum(): Uint8Array;
    getFileSize(): number;

    /** Free any allocated memory (Wasm heap, etc.) */
    dispose(): void;
}
