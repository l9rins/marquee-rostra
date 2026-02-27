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
    { id: 0, name: 'Shot Tendency', category: 'Shooting' },
    { id: 1, name: 'Inside Shots', category: 'Shooting' },
    { id: 2, name: 'Close Shots', category: 'Shooting' },
    { id: 3, name: 'Mid-Range Shots', category: 'Shooting' },
    { id: 4, name: '3-Point Shots', category: 'Shooting' },
    { id: 5, name: 'Putbacks', category: 'Inside' },
    { id: 6, name: 'Drive Lane vs. Spot Up', category: 'Shooting Setup' },
    { id: 7, name: 'Pull Up vs. Penetrate', category: 'Shooting Setup' },
    { id: 8, name: 'Pump Fake', category: 'Shooting Setup' },
    { id: 9, name: 'Triple Threat', category: 'Shooting Setup' },
    { id: 10, name: 'Triple Threat Shot', category: 'Shooting Setup' },
    { id: 11, name: 'No 3-Threat Moves', category: 'Shooting Setup' },
    { id: 12, name: 'Straight Dribble', category: 'Dribbling' },
    { id: 13, name: 'SizeUp', category: 'Dribbling' },
    { id: 14, name: 'Hesitation', category: 'Dribbling' },
    { id: 15, name: 'Drive Right vs. Left', category: 'Driving' },
    { id: 16, name: 'Crossover', category: 'Dribbling' },
    { id: 17, name: 'Spin', category: 'Dribbling' },
    { id: 18, name: 'Step Back', category: 'Dribbling' },
    { id: 19, name: 'Half Spin', category: 'Dribbling' },
    { id: 20, name: 'Double Cross', category: 'Dribbling' },
    { id: 21, name: 'Behind The Back', category: 'Dribbling' },
    { id: 22, name: 'Hesitation Cross', category: 'Dribbling' },
    { id: 23, name: 'In And Out', category: 'Dribbling' },
    { id: 24, name: 'Simple Drive', category: 'Driving' },
    { id: 25, name: 'Attack The Basket', category: 'Driving' },
    { id: 26, name: 'Pass Out', category: 'Playmaking' },
    { id: 27, name: 'Fadeaways', category: 'Shooting' },
    { id: 28, name: 'Stepback Jumper', category: 'Shooting' },
    { id: 29, name: 'Spin Jumper', category: 'Shooting' },
    { id: 30, name: 'Dunk vs. LayUp', category: 'Inside' },
    { id: 31, name: 'Alley-Oops', category: 'Inside' },
    { id: 32, name: 'Use Glass', category: 'Shooting' },
    { id: 33, name: 'Draw Foul', category: 'Driving' },
    { id: 34, name: 'Crash', category: 'Rebounding' },
    { id: 35, name: 'Pick & Roll vs. Fade', category: 'Playmaking' },
    { id: 36, name: 'Post Up', category: 'Post Moves' },
    { id: 37, name: 'Touches', category: 'Playmaking' },
    { id: 38, name: 'Post Spin', category: 'Post Moves' },
    { id: 39, name: 'Post Drive', category: 'Post Moves' },
    { id: 40, name: 'Aggressive Backdown', category: 'Post Moves' },
    { id: 41, name: 'Leave Post', category: 'Post Moves' },
    { id: 42, name: 'Drop Step', category: 'Post Moves' },
    { id: 43, name: 'Face Up', category: 'Post Moves' },
    { id: 44, name: 'Back Down', category: 'Post Moves' },
    { id: 45, name: 'Post Shots', category: 'Post Moves' },
    { id: 46, name: 'Post Hook', category: 'Post Moves' },
    { id: 47, name: 'Post Fadeaway', category: 'Post Moves' },
    { id: 48, name: 'Shimmy Shot', category: 'Post Moves' },
    { id: 49, name: 'Hop Shot', category: 'Post Moves' },
    { id: 50, name: 'Flashy Passes', category: 'Playmaking' },
    { id: 51, name: 'Throw Alley-Oop', category: 'Playmaking' },
    { id: 52, name: 'Hard Foul', category: 'Defense' },
    { id: 53, name: 'Take Charge', category: 'Defense' },
    { id: 54, name: 'Play Pass Lane', category: 'Defense' },
    { id: 55, name: 'On-Ball Steal', category: 'Defense' },
    { id: 56, name: 'Contest Shot', category: 'Defense' },
    { id: 57, name: 'Commit Foul', category: 'Defense' },
];

// ============================================================================
// Animation definitions — all 40, matching RED MC
// ============================================================================

export interface AnimationMeta {
    id: number;
    name: string;
    category: string;
}

export const ANIMATION_DEFS: AnimationMeta[] = [
    { id: 0, name: 'Release Timing', category: 'Shots' },
    { id: 1, name: 'Shooting Form', category: 'Shots' },
    { id: 2, name: 'Shot Base', category: 'Shots' },
    { id: 3, name: 'Fadeaway', category: 'Shots' },
    { id: 4, name: 'Contested', category: 'Shots' },
    { id: 5, name: 'Free Throw', category: 'Shots' },
    { id: 6, name: 'Dribble Pull-Up', category: 'Momentum Shots' },
    { id: 7, name: 'Spin Jumper', category: 'Momentum Shots' },
    { id: 8, name: 'Hop Jumper', category: 'Momentum Shots' },
    { id: 9, name: 'Post Fadeaway', category: 'Post Shots' },
    { id: 10, name: 'Post Hook', category: 'Post Shots' },
    { id: 11, name: 'Post Hop Shot', category: 'Post Shots' },
    { id: 12, name: 'Post Shimmy Shot', category: 'Post Shots' },
    { id: 13, name: 'Protect Jumper', category: 'Post Shots' },
    { id: 14, name: 'Protect Spin Ch.', category: 'Post Shots' },
    { id: 15, name: 'Iso Crossover', category: 'Dribble Moves' },
    { id: 16, name: 'Iso Behind Back', category: 'Dribble Moves' },
    { id: 17, name: 'Iso Spin', category: 'Dribble Moves' },
    { id: 18, name: 'Iso Hesitation', category: 'Dribble Moves' },
    { id: 19, name: 'Layup Package', category: 'Dunks & Layups' },
    { id: 20, name: 'Go-To Dunk Package', category: 'Dunks & Layups' },
    { id: 21, name: 'Dunk Package 2', category: 'Dunks & Layups' },
    { id: 22, name: 'Dunk Package 3', category: 'Dunks & Layups' },
    { id: 23, name: 'Dunk Package 4', category: 'Dunks & Layups' },
    { id: 24, name: 'Dunk Package 5', category: 'Dunks & Layups' },
    { id: 25, name: 'Dunk Package 6', category: 'Dunks & Layups' },
    { id: 26, name: 'Dunk Package 7', category: 'Dunks & Layups' },
    { id: 27, name: 'Dunk Package 8', category: 'Dunks & Layups' },
    { id: 28, name: 'Dunk Package 9', category: 'Dunks & Layups' },
    { id: 29, name: 'Dunk Package 10', category: 'Dunks & Layups' },
    { id: 30, name: 'Dunk Package 11', category: 'Dunks & Layups' },
    { id: 31, name: 'Dunk Package 12', category: 'Dunks & Layups' },
    { id: 32, name: 'Dunk Package 13', category: 'Dunks & Layups' },
    { id: 33, name: 'Dunk Package 14', category: 'Dunks & Layups' },
    { id: 34, name: 'Dunk Package 15', category: 'Dunks & Layups' },
    { id: 35, name: 'Pregame Intro', category: 'Signature Intros' },
    { id: 36, name: 'Pregame 1', category: 'Signature Intros' },
    { id: 37, name: 'Pregame 2', category: 'Signature Intros' },
    { id: 38, name: 'Pre-Tip 1', category: 'Signature Intros' },
    { id: 39, name: 'Pre-Tip 2', category: 'Signature Intros' },
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

    // -- All 40 Animations (indexed by animation ID) --
    animations: number[];

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
    setAnimationById(index: number, animationId: number, value: number): void;

    // Legacy named setters (backward compat)
    setRating(index: number, field: RatingField, value: number): void;
    setTendency(index: number, field: TendencyField, value: number): void;
    setGear(index: number, field: GearField, value: number): void;

    saveAndRecalculateChecksum(): Uint8Array;
    getFileSize(): number;

    /** Free any allocated memory (Wasm heap, etc.) */
    dispose(): void;
}
