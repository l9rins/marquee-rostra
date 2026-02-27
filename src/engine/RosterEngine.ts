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
// Gear definitions — all 48, matching RED MC
// ============================================================================

export interface GearMeta {
    id: number;
    key: string;
    name: string;
    category: string;
}

export const GEAR_DEFS: GearMeta[] = [
    { id: 0, key: 'GHeadband', name: 'Headband', category: 'Head' },
    { id: 1, key: 'GHdbndLg', name: 'Headband Logo', category: 'Head' },
    { id: 2, key: 'GUndrshrt', name: 'Undershirt', category: 'Body' },
    { id: 3, key: 'GUndrsCol', name: 'Undershirt Color', category: 'Body' },
    { id: 4, key: 'GLeftArm', name: 'Left Arm', category: 'Left Arm' },
    { id: 5, key: 'GLArmCol', name: 'Left Arm Color', category: 'Left Arm' },
    { id: 6, key: 'GLeftElb', name: 'Left Elbow', category: 'Left Arm' },
    { id: 7, key: 'GLElbCol', name: 'Left Elbow Color', category: 'Left Arm' },
    { id: 8, key: 'GLeftWrst', name: 'Left Wrist', category: 'Left Arm' },
    { id: 9, key: 'GLWrstC1', name: 'Left Wrist Color 1', category: 'Left Arm' },
    { id: 10, key: 'GLWrstC2', name: 'Left Wrist Color 2', category: 'Left Arm' },
    { id: 11, key: 'GLeftFngr', name: 'Left Fingers', category: 'Left Arm' },
    { id: 12, key: 'GLFngrCol', name: 'Left Fingers Color', category: 'Left Arm' },
    { id: 13, key: 'GRghtArm', name: 'Right Arm', category: 'Right Arm' },
    { id: 14, key: 'GRArmCol', name: 'Right Arm Color', category: 'Right Arm' },
    { id: 15, key: 'GRghtElb', name: 'Right Elbow', category: 'Right Arm' },
    { id: 16, key: 'GRElbCol', name: 'Right Elbow Color', category: 'Right Arm' },
    { id: 17, key: 'GRghtWrst', name: 'Right Wrist', category: 'Right Arm' },
    { id: 18, key: 'GRWrstC1', name: 'Right Wrist Color 1', category: 'Right Arm' },
    { id: 19, key: 'GRWrstC2', name: 'Right Wrist Color 2', category: 'Right Arm' },
    { id: 20, key: 'GRghtFngr', name: 'Right Fingers', category: 'Right Arm' },
    { id: 21, key: 'GRFngrCol', name: 'Right Fingers Color', category: 'Right Arm' },
    { id: 22, key: 'GPresShrt', name: 'Pressure Shorts', category: 'Legs' },
    { id: 23, key: 'GPrsShCol', name: 'Pressure Shorts Color', category: 'Legs' },
    { id: 24, key: 'GLeftLeg', name: 'Left Leg', category: 'Left Leg' },
    { id: 25, key: 'GLLegCol', name: 'Left Leg Color', category: 'Left Leg' },
    { id: 26, key: 'GLeftKnee', name: 'Left Knee', category: 'Left Leg' },
    { id: 27, key: 'GLKneeCol', name: 'Left Knee Color', category: 'Left Leg' },
    { id: 28, key: 'GLeftAnkl', name: 'Left Ankle', category: 'Left Leg' },
    { id: 29, key: 'GLAnklCol', name: 'Left Ankle Color', category: 'Left Leg' },
    { id: 30, key: 'GRghtLeg', name: 'Right Leg', category: 'Right Leg' },
    { id: 31, key: 'GRLegCol', name: 'Right Leg Color', category: 'Right Leg' },
    { id: 32, key: 'GRghtKnee', name: 'Right Knee', category: 'Right Leg' },
    { id: 33, key: 'GRKneeCol', name: 'Right Knee Color', category: 'Right Leg' },
    { id: 34, key: 'GRghtAnkl', name: 'Right Ankle', category: 'Right Leg' },
    { id: 35, key: 'GRAnklCol', name: 'Right Ankle Color', category: 'Right Leg' },
    { id: 36, key: 'GSockLngh', name: 'Socks Length', category: 'Shoes & Socks' },
    { id: 37, key: 'GShsBrLck', name: 'Shoe Brand Lock', category: 'Shoes & Socks' },
    { id: 38, key: 'GShsBrand', name: 'Shoe Brand', category: 'Shoes & Socks' },
    { id: 39, key: 'GShsModel1', name: 'Shoe Model 1', category: 'Shoes & Socks' },
    { id: 40, key: 'GShsModel2', name: 'Shoe Model 2', category: 'Shoes & Socks' },
    { id: 41, key: 'GShsModel3', name: 'Shoe Model 3', category: 'Shoes & Socks' },
    { id: 42, key: 'GShsModel4', name: 'Shoe Model 4', category: 'Shoes & Socks' },
    { id: 43, key: 'GShsColMod', name: 'Shoe Color Mode', category: 'Shoes & Socks' },
    { id: 44, key: 'GShsColHSd', name: 'Shoe Color Home Side', category: 'Shoes & Socks' },
    { id: 45, key: 'GShsColHTr', name: 'Shoe Color Home Trim', category: 'Shoes & Socks' },
    { id: 46, key: 'GShsColASd', name: 'Shoe Color Away Side', category: 'Shoes & Socks' },
    { id: 47, key: 'GShsColATr', name: 'Shoe Color Away Trim', category: 'Shoes & Socks' },
];

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

export type GearField = never; // Deprecated, use numeric indices via GEAR_DEFS

// ============================================================================
// Player data structure
// ============================================================================

export const VITAL_POSITION = 0;
export const VITAL_HEIGHT = 1;
export const VITAL_WEIGHT = 2;
export const VITAL_BIRTH_DAY = 3;
export const VITAL_BIRTH_MONTH = 4;
export const VITAL_BIRTH_YEAR = 5;
export const VITAL_HAND = 6;
export const VITAL_DUNK_HAND = 7;
export const VITAL_YEARS_PRO = 8;
export const VITAL_JERSEY_NUM = 9;
export const VITAL_TEAM_ID1 = 10;
export const VITAL_TEAM_ID2 = 11;
export const VITAL_CONTRACT_Y1 = 12;
export const VITAL_CONTRACT_Y2 = 13;
export const VITAL_CONTRACT_Y3 = 14;
export const VITAL_CONTRACT_Y4 = 15;
export const VITAL_CONTRACT_Y5 = 16;
export const VITAL_CONTRACT_Y6 = 17;
export const VITAL_CONTRACT_Y7 = 18;
export const VITAL_CONTRACT_OPT = 19;
export const VITAL_NO_TRADE = 20;
export const VITAL_INJURY_TYPE = 21;
export const VITAL_INJURY_DAYS = 22;
export const VITAL_PLAY_STYLE = 23;
export const VITAL_PLAY_TYPE1 = 24;
export const VITAL_PLAY_TYPE2 = 25;
export const VITAL_PLAY_TYPE3 = 26;
export const VITAL_PLAY_TYPE4 = 27;
export const VITAL_SKIN_TONE = 28;
export const VITAL_BODY_TYPE = 29;
export const VITAL_MUSCLE_TONE = 30;
export const VITAL_HAIR_TYPE = 31;
export const VITAL_HAIR_COLOR = 32;
export const VITAL_EYE_COLOR = 33;
export const VITAL_EYEBROW = 34;
export const VITAL_MUSTACHE = 35;
export const VITAL_FCL_HAIR_CLR = 36;
export const VITAL_BEARD = 37;
export const VITAL_GOATEE = 38;
export const VITAL_SEC_POS = 39;
export const VITAL_DRAFT_YEAR = 40;
export const VITAL_DRAFT_ROUND = 41;
export const VITAL_DRAFT_PICK = 42;
export const VITAL_DRAFT_TEAM = 43;
export const VITAL_NICKNAME = 44;
export const VITAL_PLAY_INITIATOR = 45;
export const VITAL_GOES_TO_3PT = 46;
export const VITAL_PEAK_AGE_START = 47;
export const VITAL_PEAK_AGE_END = 48;
export const VITAL_POTENTIAL = 49;
export const VITAL_LOYALTY = 50;
export const VITAL_FINANCIAL_SECURITY = 51;
export const VITAL_PLAY_FOR_WINNER = 52;

export const BODY_TYPE_NAMES = ['Slim', 'Normal', 'Thick', 'Athletic'];
export const MUSCLE_TONE_NAMES = ['Buff', 'Ripped'];
export const HAIR_COLOR_NAMES = [
    'Black', 'Dark Brown', 'Medium Brown', 'Light Brown', 'Very Light Brown', 'Dark Blonde', 'Medium Blonde', 'Light Blonde', 'Very Light Blonde', 'Gray', 'White', 'Red', 'Green', 'Blue', 'Yellow', 'Orange'
];
export const EYE_COLOR_NAMES = ['Blue', 'Brown', 'Green', 'Hazel', 'Amber', 'Gray'];
export const HAIR_TYPE_NAMES = [
    'No Hair', 'Short Stubble', 'Medium Stubble', 'Dark Stubble', 'Dark Recessed Stubble', 'Balding Stubble', 'Short Buzz', 'Buzz', 'Widow\'s Peak Buzz', 'Balding Buzz', 'Natural Waves', 'Natural Patches', 'Natural Part', 'Natural Fauxhawk', 'Natural Balding', 'Thick Cornrows', 'Thin Cornrows', 'Afro', 'Messy', 'Twisties', 'Short Dreads', 'Medium Dreads', 'Tied Dreads', 'Dreads Tail', 'Mop', 'Mop Tail', 'Straight Short', 'Straight Long', 'Straight Flat', 'Straight Part', 'Straight Tail', 'Straight Balding', 'Spikey', 'Curly', 'Balding Flat', 'Short Flat', 'Medium Flat', 'Wavy', 'Shaggy', 'Mohawk', 'The Patch'
];

export const NICKNAME_NAMES = [
    'ABC', 'A-Train', 'B', 'Baddest One', 'Baller', 'Big Cat', 'Big Daddy', 'Big Dog', 'Big Red', 'Big Smooth', 'Black Hole', 'Boomer', 'Boss', 'Bottoms', 'B-Train', 'Buckets', 'Captain Clutch', 'Champ', 'Clutch', 'Cool Hands', 'Cowboy', 'D', 'Dimes', 'Doc', 'Dub', 'Easy Breezy', 'Flash', 'Fresh', 'G', 'Garbage Man', 'Goose', 'Houdini', 'Insanity', 'J', 'Lights Out', 'Little General', 'Magician', 'Maverick', 'Miracle Man', 'Money', 'Mr. Clutch', 'Mr. Fundamentals', 'Mr. Incredible', 'Mr. Moves', 'Mr. Perfect', 'P', 'Prime Time', 'Q', 'Rain Man', 'Red Hot', 'Shake n\' Bake', 'Shorty', 'Silk', 'Skinny', 'Slim', 'Smooth', 'Speedy', 'T', 'The Beast', 'The Body Guard', 'The Bulldozer', 'The Captain', 'The Chosen One', 'The Closer', 'The Cobra', 'The Doctor', 'The Dude', 'The Eraser', 'The Franchise', 'The General', 'The Great', 'The Great One', 'The Kid', 'The Machine', 'The Magician', 'The Mayor', 'The Monster', 'The Natural', 'The Prodigy', 'The Professor', 'The Prophet', 'The Quick', 'The Waiter', 'The Wizard', 'Thunder', 'Tiny', 'Z'
];

export const INJURY_TYPE_NAMES = ["Healthy", "Appendectomy", "Arthroscopic Surgery", "Back Spasms", "Bone Bruise", "Bone Spurs", "Broken Ankle", "Broken Arm", "Broken Back", "Broken Finger", "Broken Foot", "Broken Hand", "Broken Hip", "Broken Jaw", "Broken Patella", "Broken Nose", "Broken Rib", "Broken Toe", "Broken Wrist", "Bruised Heel", "Bruised Hip", "Bruised Knee", "Bruised Rib", "Bruised Spinal Cord", "Bruised Sternum", "Bruised Tailbone", "Bruised Thigh", "Concussion", "Dislocated Finger", "Dislocated Patella", "Elbow Surgery", "Eye Surgery", "Fatigue", "Flu", "Foot Surgery", "Fractured Eye Socket", "Hand Surgery", "Hernia", "High Ankle Sprain", "Hip Surgery", "Hyperextended Knee", "Inner Ear Infection", "Knee Surgery", "Knee Tendinitis", "Lower Back Strain", "Microfracture Surgery", "Migraine Headache", "Plantar Fasciitis", "Personal Reason", "Separated Shoulder", "Severe Ankle Sprain", "Shin Splints", "Sore Ankle", "Sore Back", "Sore Foot", "Sore Handt", "Sore Hamstring", "Sore Knee", "Sore Wrist", "Sprained Ankle", "Sprained Finger", "Sprained Foot", "Sprained Knee", "Sprained Shoulder", "Sprained Toe", "Sprained Wrist", "Strained Abdomen", "Strained Achilles", "Strained Calf", "Strained Elbow", "Strained Groin", "Strained Hamstring", "Strained Hip Flexor", "Strained Knee", "Strained MCL", "Sprained Neck", "Strained Oblique", "Strained Quad", "Stress Fracture", "Suspended", "Torn Achilles", "Torn ACL", "Torn Bicep", "Torn Ligament Foot", "Torn Hamstring", "Torn Hip Flexor", "Torn Labrum", "Torn Ligament Elbow", "Torn Hand Ligament", "Torn MCL", "Torn Meniscus", "Torn Patellar Tendon", "Torn Tricep"];

export const SIG_SKILL_NAMES: string[] = [
    "None", "Posterizer", "Highlight Film", "Finisher", "Acrobat", "Catch and Shoot", "Shot Creator",
    "Deadeye", "Corner Specialist", "Screen Outlet", "Post Proficiency", "Ankle Breaker", "Pick & Roll Maestro",
    "One Man Fastbreak", "Post Playmaker", "Dimer", "Break Starter", "Alley-Ooper", "Flashy Passer",
    "Brick Wall", "Hustle Points", "Lockdown Defender", "Charge Card", "Interceptor", "Pick Pocket",
    "Active Hands", "Pick Dodger", "Eraser", "Chasedown Artist", "Floor General", "Defensive Anchor",
    "Bruiser", "Scrapper", "Tenacious Rebounder", "Anti-Freeze", "Microwave", "Heat Retention", "Closer",
    "Gatorade |TM| Perform Pack", "On Court Coach", "LeBron Coast to Coast", "Assist Bonus (unused stub?)",
    "Off. Awareness Bonus (unused stub?)", "Def. Awareness Bonus (unused stub?)", "Attribute Penalty (unused stub?)"
];


/** Play Style ID → Display Name */
export const PLAY_STYLE_NAMES: Record<number, string> = {
    0: 'All-Around', 1: 'Athletic', 2: 'Slasher', 3: 'Scorer',
    4: 'Point Forward', 5: 'Defensive', 6: '3pt Specialist',
    7: 'Post-Up', 8: 'Face-Up', 9: 'Back-to-Basket', 10: 'Rebounder',
};

/** Play Type ID → Display Name */
export const PLAY_TYPE_NAMES: Record<number, string> = {
    0: 'None', 1: 'Isolation', 2: 'P&R Ball Handler', 3: 'P&R Roll Man',
    4: 'Post Up Low', 5: 'Post Up High', 6: 'P&R Point', 7: 'Cuts',
    8: 'Off-Screen', 9: 'Mid-Range', 10: '3PT', 11: 'Guard Post Up',
};

/** Contract Option ID → Display Name */
export const CONTRACT_OPT_NAMES: Record<number, string> = {
    0: 'None', 1: 'Team Option', 2: 'Player Option',
};

// ============================================================================
// Team Data Interfaces
// ============================================================================

export interface TeamData {
    index: number;
    teamId: number;
    name: string;
    city: string;
    abbr: string;

    // Colors (32-bit ARGB)
    color1: number;
    color2: number;

    // Roster (15-man active roster, storing CFIDs or player indices)
    rosterIndices: number[];
}

// ============================================================================
// Player Data Interfaces
// ============================================================================

export interface PlayerData {
    index: number;
    cfid: number;
    firstName: string;
    lastName: string;
    position: string;

    // -- All 9 Bio/Vitals (indexed by VitalID) --
    vitals: number[];

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

    // -- All 48 Gear elements (indexed by gear ID) --
    gear: number[];

    // -- Legacy named gear (backward compat) --
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

/** Team property keys */
export type TeamProperty = 'name' | 'city' | 'abbr' | 'color1' | 'color2';

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
    setGearById(index: number, gearId: number, value: number): void;
    setVitalById(index: number, vitalId: number, value: number): void;

    // Legacy named setters (backward compat)
    setRating(index: number, field: RatingField, value: number): void;
    setTendency(index: number, field: TendencyField, value: number): void;
    setGear(index: number, field: GearField, value: number): void;

    // Team Data
    getTeamCount(): number;
    getTeam(index: number): TeamData;
    setTeamProperty(index: number, property: TeamProperty, value: string | number): void;

    /** Move a player between teams or to free agency (newTeamIndex = null) */
    updateRosterAssignment(playerIndex: number, newTeamIndex: number | null): void;

    saveAndRecalculateChecksum(): Uint8Array;
    getFileSize(): number;

    /** Free any allocated memory (Wasm heap, etc.) */
    dispose(): void;
}
