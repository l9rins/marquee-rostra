// ============================================================================
// RosterEnums.ts — Dictionary maps extracted from RED MC's Enums.txt
// ============================================================================
// Maps raw integer values to human-readable names for animations, gear, etc.
// Each Record<number, string> is keyed by the raw byte value stored in the .ROS
// file and returns the display label for the UI's <Select> dropdowns.
//
// Source: inspiration_repo/RED MC/Text/Enums.txt (2K14 edition)
// ============================================================================

// ---------------------------------------------------------------------------
// Animation Enum Maps — one per animation slot ID
// ---------------------------------------------------------------------------

/** Anim ID 0: Release Timing (Enums L98) */
export const ENUM_RELEASE_TIMING: Record<number, string> = {
    0: 'Normal',
    1: 'Quick',
    2: 'Late',
    255: 'Default / None',
};

/** Anim ID 1: Shooting Form / Shot Release (Enums L99) — 92 generic + player names */
export const ENUM_SHOT_RELEASE: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Release 1', 'Release 2', 'Release 3', 'Release 4', 'Release 5', 'Release 6', 'Release 7', 'Release 8', 'Release 9', 'Release 10',
        'Release 11', 'Release 12', 'Release 13', 'Release 14', 'Release 15', 'Release 16', 'Release 17', 'Release 18', 'Release 19', 'Release 20',
        'Release 21', 'Release 22', 'Release 23', 'Release 24', 'Release 25', 'Release 26', 'Release 27', 'Release 28', 'Release 29', 'Release 30',
        'Release 31', 'Release 32', 'Release 33', 'Release 34', 'Release 35', 'Release 36', 'Release 37', 'Release 38', 'Release 39', 'Release 40',
        'Release 41', 'Release 42', 'Release 43', 'Release 44', 'Release 45', 'Release 46', 'Release 47', 'Release 48', 'Release 49', 'Release 50',
        'Release 51', 'Release 52', 'Release 53', 'Release 54', 'Release 55', 'Release 56', 'Release 57', 'Release 58', 'Release 59', 'Release 60',
        'Release 61', 'Release 62', 'Release 63', 'Release 64', 'Release 65', 'Release 66', 'Release 67', 'Release 68', 'Release 69', 'Release 70',
        'Release 71', 'Release 72', 'Release 73', 'Release 74', 'Release 75', 'Release 76', 'Release 77', 'Release 78', 'Release 79', 'Release 80',
        'Release 81', 'Release 82', 'Release 83', 'Release 84', 'Release 85', 'Release 86', 'Release 87', 'Release 88', 'Release 89', 'Release 90',
        'Release 91', 'Release 92',
        'J. Akognon', 'L. Aldridge', 'R. Allen', 'R. Anderson', 'C. Anthony', 'A. Bargnani', 'H. Barnes', 'D. Barnett',
        'K. Bazemore', 'M. Beasley', 'C. Billups', 'L. Bird', 'A. Bogut', 'M. Bonner', 'C. Boozer', 'C. Bosh',
        'K. Bryant', 'T. Burke', 'M. Camby', 'V. Carter', 'S. Curry', 'K. Duckworth', 'T. Duncan', 'K. Durant',
        'M. Ellis', 'T. Evans', 'P. Ewing', 'D. Gallinari', 'K. Garnett', 'P. Gasol', 'R. Gay', 'P. George',
        'M. Ginobili', 'D. Granger', 'B. Griffin', 'J. Harden', 'D. Howard', 'A. Iguodala', 'K. Irving', 'L. James',
        'C. Johnson', 'J. Johnson', 'M. Johnson', 'M. Jordan', 'J. Kidd', 'B. Laimbeer', 'D. Lee', 'D. Lillard',
        'B. Lopez', 'K. Love', 'K. Malone', 'K. Martin', 'B. McLemore', 'S. Nash', 'D. Nowitzki', 'S. O\'Neal',
        'C. Oakley', 'T. Parker', 'C. Paul', 'K. Perkins', 'P. Pierce', 'Z. Randolph', 'A. Rivers', 'O. Robertson',
        'D. Robinson', 'D. Rose', 'J. Smith', 'J. Stockton', 'A. Stoudemire', 'D. Wade', 'D. Waiters', 'K. Walker',
        'J. Wall', 'G. Wallace', 'J. West', 'R. Westbrook', 'D. Williams',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 2: Shot Base (Enums L100) — 49 Jump Shots + 19 Set Shots + player names */
export const ENUM_SHOT_BASE: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Jump Shot 1', 'Jump Shot 2', 'Jump Shot 3', 'Jump Shot 4', 'Jump Shot 5', 'Jump Shot 6', 'Jump Shot 7', 'Jump Shot 8', 'Jump Shot 9', 'Jump Shot 10',
        'Jump Shot 11', 'Jump Shot 12', 'Jump Shot 13', 'Jump Shot 14', 'Jump Shot 15', 'Jump Shot 16', 'Jump Shot 17', 'Jump Shot 18', 'Jump Shot 19', 'Jump Shot 20',
        'Jump Shot 21', 'Jump Shot 22', 'Jump Shot 23', 'Jump Shot 24', 'Jump Shot 25', 'Jump Shot 26', 'Jump Shot 27', 'Jump Shot 28', 'Jump Shot 29', 'Jump Shot 30',
        'Jump Shot 31', 'Jump Shot 32', 'Jump Shot 33', 'Jump Shot 34', 'Jump Shot 35', 'Jump Shot 36', 'Jump Shot 37', 'Jump Shot 38', 'Jump Shot 39', 'Jump Shot 40',
        'Jump Shot 41', 'Jump Shot 42', 'Jump Shot 43', 'Jump Shot 44', 'Jump Shot 45', 'Jump Shot 46', 'Jump Shot 47', 'Jump Shot 48', 'Jump Shot 49',
        'Set Shot 1', 'Set Shot 2', 'Set Shot 3', 'Set Shot 4', 'Set Shot 5', 'Set Shot 6', 'Set Shot 7', 'Set Shot 8', 'Set Shot 9', 'Set Shot 10',
        'Set Shot 11', 'Set Shot 12', 'Set Shot 13', 'Set Shot 14', 'Set Shot 15', 'Set Shot 16', 'Set Shot 17', 'Set Shot 18', 'Set Shot 19',
        'J. Akognon', 'L. Aldridge', 'R. Allen', 'R. Anderson', 'C. Anthony', 'A. Bargnani', 'H. Barnes', 'D. Barnett',
        'K. Bazemore', 'M. Beasley', 'C. Billups', 'L. Bird', 'A. Bogut', 'M. Bonner', 'C. Boozer', 'C. Bosh',
        'K. Bryant', 'T. Burke', 'M. Camby', 'V. Carter', 'S. Curry', 'K. Duckworth', 'T. Duncan', 'K. Durant',
        'M. Ellis', 'T. Evans', 'P. Ewing', 'D. Gallinari', 'K. Garnett', 'P. Gasol', 'R. Gay', 'P. George',
        'M. Ginobili', 'D. Granger', 'B. Griffin', 'J. Harden', 'D. Howard', 'A. Iguodala', 'K. Irving', 'L. James',
        'C. Johnson', 'J. Johnson', 'M. Johnson', 'M. Jordan', 'J. Kidd', 'B. Laimbeer', 'D. Lee', 'D. Lillard',
        'B. Lopez', 'K. Love', 'K. Malone', 'K. Martin', 'B. McLemore', 'S. Nash', 'D. Nowitzki', 'S. O\'Neal',
        'C. Oakley', 'T. Parker', 'C. Paul', 'K. Perkins', 'P. Pierce', 'Z. Randolph', 'A. Rivers', 'O. Robertson',
        'D. Robinson', 'D. Rose', 'J. Smith', 'J. Stockton', 'A. Stoudemire', 'D. Wade', 'D. Waiters', 'K. Walker',
        'J. Wall', 'G. Wallace', 'J. West', 'R. Westbrook', 'D. Williams',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 3: Shot Landing (Enums L101) */
export const ENUM_SHOT_LANDING: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'J Awkward', 'J Big Kick', 'J Big Kick 2', 'J Big Kick 3', 'J Lean', 'J Small Kick', 'J Small Kick 2',
        'J Small Kick 3', 'J Small Kick 4', 'S Big Kick', 'S Bowed', 'S Grounded', 'S Grounded 2', 'S Hop Back',
        'S Kick', 'S Late Kick', 'S Side Hop', 'S Small Kick', 'S Small Step', 'S Tight',
        'K. Bryant', 'K. Durant', 'L. James', 'W. Johnson', 'S. Marion', 'S. Nash',
        'D. Nowitzki', 'P. Pierce', 'D. Rose', 'E. Turner', 'D. Wade',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 4: Contested Shot Size (Enums L25) */
export const ENUM_CONTESTED: Record<number, string> = {
    0: 'Normal',
    1: 'Big',
    255: 'Default / None',
};

/** Anim ID 5: Free Throw Form (Enums L27) */
export const ENUM_FREE_THROW: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Guard Default', 'Guard Angled', 'Guard Grounded', 'Guard High Hold', 'Guard High Push',
        'Guard Hold', 'Guard Normal', 'Guard Quick Flick', 'Guard Quick Release', 'Guard Textbook',
        'Swingman Default', 'Swingman Angled', 'Swingman Angled Hold', 'Swingman Grounded',
        'Swingman High', 'Swingman High Push', 'Swingman Hold', 'Swingman Straight', 'Swingman Quick Release',
        'Bigman Default', 'Bigman Angled', 'Bigman Athletic', 'Bigman Extend', 'Bigman Extend Follow',
        'Bigman Flick', 'Bigman Grounded', 'Bigman Hard Flick', 'Bigman High Push', 'Bigman Hold', 'Bigman Textbook',
        'M. Jordan', 'S. Nash', 'T. Parker', 'C. Paul',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 6: Dribble Pull-Up (Enums L26) */
export const ENUM_DRIBBLE_PULLUP: Record<number, string> = {
    0: 'Bowed',
    1: 'Elite',
    2: 'Elite 2',
    3: 'Normal',
    4: 'One Foot',
    5: 'Stiff',
    255: 'Default / None',
};

/** Anim ID 9: Post Fadeaway (Enums L106) */
export const ENUM_POST_FADEAWAY: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Normal', 'Fade 1', 'Fade 2', 'Fade 3', 'Fade 4', 'Fade 5', 'Fade 6', 'Fade 7', 'Fade 8', 'Fade 9',
        'H. Barnes', 'B. Cartwright', 'C. Johnson', 'M. Jordan', 'K. Malone', 'D. Nowitzki',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 10: Post Hook (Enums L107) */
export const ENUM_POST_HOOK: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Normal', 'Ames', 'Big', 'Big Smooth', 'Compact', 'Crusader', 'Deliberate', 'Gaucho', 'One Foot', 'Quick',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 15: Iso Crossover (Enums L40) */
export const ENUM_ISO_CROSSOVER: Record<number, string> = {
    0: 'Crossover 1',
    1: 'Crossover 2',
    2: 'Crossover 3',
    3: 'Crossover 4',
    4: 'Crossover 5',
    5: 'Crossover 6',
    255: 'Default / None',
};

/** Anim ID 16: Iso Behind Back (Enums L41) */
export const ENUM_ISO_BEHIND_BACK: Record<number, string> = {
    0: 'Behind Back 1',
    1: 'Behind Back 2',
    2: 'Behind Back 3',
    3: 'Behind Back 4',
    4: 'Behind Back 5',
    5: 'Behind Back 6',
    6: 'Behind Back 7',
    255: 'Default / None',
};

/** Anim ID 17: Iso Spin (Enums L42) */
export const ENUM_ISO_SPIN: Record<number, string> = {
    0: 'Spin 1',
    1: 'Spin 2',
    2: 'Spin 3',
    3: 'Spin 4',
    4: 'Spin 5',
    5: 'Spin 6',
    6: 'Spin 7',
    255: 'Default / None',
};

/** Anim ID 18: Iso Hesitation (Enums L43) */
export const ENUM_ISO_HESITATION: Record<number, string> = {
    0: 'Hesitation 1',
    1: 'Hesitation 2',
    2: 'Hesitation 3',
    3: 'Hesitation 4',
    255: 'Default / None',
};

/** Anim ID 19: Layup Package (Enums L108) */
export const ENUM_LAYUP_PACKAGE: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Guard', 'Swing', 'Big',
        'C. Anthony', 'J. Crawford', 'T. Duncan', 'K. Durant', 'M. Ellis', 'B. Griffin', 'J. Harden',
        'L. James', 'M. Jordan', 'D. Rose', 'C. Paul', 'R. Rondo', 'D. Wade', 'R. Westbrook',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 20: Go-To Dunk Package / Dunk Packages (Enums L109) */
export const ENUM_DUNK_PACKAGE: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'None', 'Under Basket Rim Pulls', 'Under Basket Regular', 'Under Basket Athletic Flushes',
        'Rim Grazers off One', 'Rim Grazers off Two', 'Basic One-Handers off One', 'Basic Two-Handers off One',
        'Basic One-Handers off Two', 'Basic Two-Handers off Two', 'Bigman Basic off One', 'Bigman Basic off Two',
        'Athletic One-Handers off One', 'Athletic One-Handers off Two', 'Hangs off One', 'Bigman Hangs off One',
        'Hangs off Two', 'Athletic Hangs off Two', 'Quick Drops', 'Fist Pump Rim Pulls',
        'Bigman Tomahawks off One', 'Bigman Tomahawks off Two', 'Side Arm Tomahawks', 'Straight Arm Tomahawks',
        'Cock Back Tomahawks', 'Athletic Side Tomahawks', 'Athletic Front Tomahawks',
        'Uber Athletic Tomahawks off One', 'Uber Athletic Tomahawks off Two',
        'Leaning Slams', 'Front Clutches', 'Front Clutches off Two',
        'Side Clutches off One', 'Bigman Side Clutches off One', 'Side Clutches off Two',
        'Back Scratchers off One', 'Back Scratchers off Two', 'Back Scratching Rim Hangs',
        'Bigman Back Scratchers', 'Quick Drop-in Back Scratchers',
        'Reverses off One', 'One Hand Clutch Reverses', 'Reverses off Two',
        'Clutch Reverses off One', 'Clutch Reverses off Two', 'Baseline Clutch Reverses',
        'Windmill Reverses', 'Baseline Reverses off One', 'Baseline Reverses off Two',
        'Windmill Baseline Reverses', 'Clutch Baseline Reverses', 'Bigman Baseline Reverses',
        'Switcheroos', 'Windmills off One', 'Leaning Windmills', 'Bigman Windmills',
        'Front Windmills', 'Side Windmills', 'Athletic Windmills',
        'Basic 360s', 'Athletic 360s', 'Cradle Dunks',
        'Historic Jordan', 'Historic Drexler',
        'Facebook Dunk Package (crashes!)', 'Verticality (crashes!)',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 35: Pregame Intro (Enums L110) */
export const ENUM_PREGAME_INTRO: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Default', 'L. James Anthem', 'D. Wade Anthem',
        'Huddle Dance - Kicks', 'Huddle Dance - Pumps', 'Huddle Dance - Robot',
        'Huddle Dance - Running', 'Huddle Dance - Shake',
        'Lineup - Back Slide', 'Lineup - Buzzerbeater', 'Lineup - Fake Out', 'Lineup - Get Low',
        'Lineup - Jersey', 'Lineup - Jump', 'Lineup - Low Fives', 'Lineup - Power Up',
        'Lineup - Push Ups', 'Lineup - The Wheel',
        'Trick Shot - Behind Back', 'Trick Shot - No Look', 'Trick Shot - On Bended Knees',
        'Trick Shot - Rock the Floor', 'Trick Shot - The Runner', 'Trick Shot - Turn Around',
        'Trick Shot - Underhand',
        'All Eyes On Me (crashes!)', 'Game On (crashes!)', 'Stardom (crashes!)',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 36: Celebration - Dunk (Enums L111) */
export const ENUM_CELEBRATION_DUNK: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Default', 'T. Duncan Rim Hang', 'B. Griffin Rim Hang', 'K. Garnett Bang Head',
        'L. James Salute', 'D. Wade Rim Hang', 'D. Wade Boxing', 'L. James Handshake',
        'Ankle Breaker', 'Boxing Exercise', 'Boxing Match', 'Bump and Jump', 'Bunny Hop',
        'Cabbage Patch', 'Double Kneel', 'Foot Grab', 'Foot Lock', 'Gone Fishing', 'Home Run',
        'Kickoff', 'Left Hanging', 'Left Hanging Again', 'On Camera', 'Punching Bag',
        'Rim Hang - Flex', 'Rim Hang - Swing Out (crashes!)', 'Rim Hang - Tap (crashes!)',
        'Robot (crashes!)', 'Salsa', 'Shake Up', 'Shove Off', 'Superhero', 'Snap Dance',
        'The Wheelbarrow', 'Touchdown Pass', 'Trust My Buddy',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 37: Celebration - PreGame / Pre-Tip (Enums L112) */
export const ENUM_CELEBRATION_PREGAME: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Default', 'R. Allen Powder', 'C. Anthony Inspect Ball', 'C. Anthony Handshake',
        'C. Billups Inspect Ball', 'C. Boozer Smack Table', 'C. Boozer Inspect Ball',
        'K. Bryant Teammate Hug', 'K. Bryant Powder', 'V. Carter Rim Pull-up',
        'T. Duncan Inspect Ball', 'K. Durant Shoulder Brush', 'K. Durant Handshake',
        'K. Garnett Hype Crowd', 'K. Garnett Powder', 'D. Howard Post Play',
        'D. Howard Handshake', 'L. James Inspect Ball',
        'M. Jordan Powder', 'M. Jordan Powder 2', 'J. Lin Textbook',
        'D. Nowitzki Low Fives', 'D. Nowitzki Tie Shoes', 'C. Paul Teammate Hug',
        'D. Wade Hype Crowd', 'D. Wade Handshake',
        'Backflip Grounded', 'Backflip Elevated', 'Championship Belt', 'Chicken Dance',
        'Dunk On You', 'Get Hip', 'Home Run Hit', 'I Can\'t Hear You', 'Kneel and Focus',
        'Push Ups', 'Take A Bow', 'The Robot', 'The Salsa', 'Hand Stand',
        'Hype Crowd - Let\'s Hear It', 'Hype Crowd - Chest Pump', 'Hype Crowd - Rally',
        'Hype Crowd - Louder', 'Hype Crowd - I Can\'t Hear You', 'Hype Crowd - Our House',
        'Powder - Routine Basic', 'Powder - Routine Spread', 'Powder - Chest Tap',
        'Powder - Point To Sky',
        'Stanchion - Head Bang', 'Stanchion - Beat It', 'Stanchion - Punch Out 1',
        'Stanchion - Punch Out 2', 'Stanchion - Focus', 'Stanchion - Punch Kick',
        'Stanchion - Punch Bag', 'Stanchion - Lean Back', 'Stanchion - Wax On',
        'With Ball - Dance', 'With Ball - Around Back', 'With Ball - Bowling',
        'With Ball - Baseball', 'With Ball - Football', 'With Ball - Hit Head',
        'With Ball - Scratch', 'With Ball - Weigh It',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 11: Post Hop Shot — reused post shot forms (Enums L34) */
export const ENUM_POST_HOP: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = ['Normal', 'Big', 'Compact', 'Crusader', 'Deliberate', 'Gaucho', 'One Foot', 'Quick'];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();

/** Anim ID 12: Post Shimmy Shot (Enums L35) */
export const ENUM_POST_SHIMMY: Record<number, string> = {
    0: 'Normal',
    1: 'Big',
    2: 'One Foot',
    255: 'Default / None',
};

/** Anim ID 13: Protect Jumper (Enums L36) */
export const ENUM_PROTECT_JUMPER: Record<number, string> = {
    0: 'Normal',
    1: 'Compact',
    2: 'Deliberate',
    3: 'Quick',
    255: 'Default / None',
};

/** Anim ID 14: Protect Spin Change (Enums L37) */
export const ENUM_PROTECT_SPIN: Record<number, string> = {
    0: 'Normal',
    1: 'Compact',
    2: 'Cougar',
    3: 'Crusader',
    4: 'Deliberate',
    5: 'Quick',
    255: 'Default / None',
};

/** Anim IDs 7 & 8: Spin Jumper & Hop Jumper (Enums L38 & L39) */
export const ENUM_SPIN_JUMPER: Record<number, string> = {
    0: 'Normal',
    1: 'Compact',
    2: 'One Foot',
    255: 'Default / None',
};

export const ENUM_HOP_JUMPER: Record<number, string> = {
    0: 'Normal',
    1: 'Compact',
    2: 'Gaucho',
    3: 'One Foot',
    255: 'Default / None',
};

/** Layup Package for Dunk Package slots 21-34 — reuse ENUM_DUNK_PACKAGE */

// ---------------------------------------------------------------------------
// Shoe Brand Enum (Enums L116)
// ---------------------------------------------------------------------------

export const SHOE_BRAND_ENUM: Record<number, string> = {
    0: 'No Lock',
    1: 'Nike',
    2: 'Adidas',
    3: 'Jordan',
    4: 'Converse',
    5: 'Reebok',
    6: 'Under Armour',
    7: 'Spalding',
    8: 'Peak',
    9: 'Anta',
    10: 'Li-Ning',
};

export const SHOE_MODEL_ENUM: Record<number, string> = {
    0: 'Generic',
    1: 'Nike',
    2: 'Adidas',
    3: 'Jordan',
    4: 'Converse',
    5: 'Reebok',
    6: 'Under Armour',
    7: 'Spalding',
    8: 'Peak',
    9: 'Anta',
    10: 'Li-Ning',
};


// ---------------------------------------------------------------------------
// Layup Package (Enums L44 — 2K13 version used for older animations)
// ---------------------------------------------------------------------------

export const ENUM_LAYUP_PACKAGE_ALT: Record<number, string> = (() => {
    const m: Record<number, string> = {};
    const names = [
        'Rookie Guard', 'Rookie Bigman', 'Pro Guard', 'All-Star Guard',
        'J. Crawford', 'Classic', 'M. Ginobili', 'Air Jordan', 'K. Bryant',
        'S. Nash', 'T. Parker', 'C. Paul', 'D. Rose', 'R. Rondo', 'D. Wade',
    ];
    names.forEach((n, i) => { m[i] = n; });
    m[255] = 'Default / None';
    return m;
})();


// ---------------------------------------------------------------------------
// Master Lookup: animation slot ID → its enum map (or null if no map)
// ---------------------------------------------------------------------------

const ANIM_ENUM_REGISTRY: Record<number, Record<number, string> | null> = {
    0: ENUM_RELEASE_TIMING,
    1: ENUM_SHOT_RELEASE,
    2: ENUM_SHOT_BASE,
    3: ENUM_SHOT_LANDING,
    4: ENUM_CONTESTED,
    5: ENUM_FREE_THROW,
    6: ENUM_DRIBBLE_PULLUP,
    7: ENUM_SPIN_JUMPER,
    8: ENUM_HOP_JUMPER,
    9: ENUM_POST_FADEAWAY,
    10: ENUM_POST_HOOK,
    11: ENUM_POST_HOP,
    12: ENUM_POST_SHIMMY,
    13: ENUM_PROTECT_JUMPER,
    14: ENUM_PROTECT_SPIN,
    15: ENUM_ISO_CROSSOVER,
    16: ENUM_ISO_BEHIND_BACK,
    17: ENUM_ISO_SPIN,
    18: ENUM_ISO_HESITATION,
    19: ENUM_LAYUP_PACKAGE,
    20: ENUM_DUNK_PACKAGE,
    // IDs 21-34: all dunk package slots — reuse the same dunk enum
    21: ENUM_DUNK_PACKAGE,
    22: ENUM_DUNK_PACKAGE,
    23: ENUM_DUNK_PACKAGE,
    24: ENUM_DUNK_PACKAGE,
    25: ENUM_DUNK_PACKAGE,
    26: ENUM_DUNK_PACKAGE,
    27: ENUM_DUNK_PACKAGE,
    28: ENUM_DUNK_PACKAGE,
    29: ENUM_DUNK_PACKAGE,
    30: ENUM_DUNK_PACKAGE,
    31: ENUM_DUNK_PACKAGE,
    32: ENUM_DUNK_PACKAGE,
    33: ENUM_DUNK_PACKAGE,
    34: ENUM_DUNK_PACKAGE,
    35: ENUM_PREGAME_INTRO,
    36: ENUM_CELEBRATION_DUNK,
    37: ENUM_CELEBRATION_PREGAME,
    // IDs 38-39: Pre-Tip slots — reuse celebration enums
    38: ENUM_CELEBRATION_PREGAME,
    39: ENUM_CELEBRATION_PREGAME,
};

/**
 * Get the enum dictionary for a given animation slot ID.
 * Returns the Record<number, string> map, or null if no enum exists.
 */
export function getAnimEnumMap(animId: number): Record<number, string> | null {
    return ANIM_ENUM_REGISTRY[animId] ?? null;
}
