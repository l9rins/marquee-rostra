#pragma once
// ============================================================================
// RosterEditor.hpp — NBA 2K14 .ROS file parser and editor
// ============================================================================

#include "BitStream.hpp"
#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

// ---------------------------------------------------------------------------
// Player — represents one player record in the roster file
// ---------------------------------------------------------------------------

// Rating field IDs (used with get_rating_by_id / set_rating_by_id)
// The IDs match the order in RED MC's Player.txt Skills section.
enum RatingID {
    RAT_OVERALL = 0,
    RAT_SHOT_LOW_POST,     // 1
    RAT_SHOT_CLOSE,        // 2
    RAT_SHOT_MEDIUM,       // 3  (Mid-Range)
    RAT_SHOT_3PT,          // 4
    RAT_SHOT_FT,           // 5
    RAT_DUNK,              // 6
    RAT_STANDING_DUNK,     // 7
    RAT_LAYUP,             // 8
    RAT_STANDING_LAYUP,    // 9
    RAT_SPIN_LAYUP,        // 10
    RAT_EURO_LAYUP,        // 11
    RAT_HOP_LAYUP,         // 12
    RAT_RUNNER,            // 13
    RAT_STEP_THROUGH,      // 14
    RAT_SHOOT_IN_TRAFFIC,  // 15
    RAT_POST_FADEAWAY,     // 16
    RAT_POST_HOOK,         // 17
    RAT_SHOOT_OFF_DRIBBLE, // 18
    RAT_BALL_HANDLING,     // 19
    RAT_OFF_HAND_DRIBBLE,  // 20
    RAT_BALL_SECURITY,     // 21
    RAT_PASS,              // 22
    RAT_BLOCK,             // 23
    RAT_STEAL,             // 24
    RAT_HANDS,             // 25
    RAT_ON_BALL_DEF,       // 26
    RAT_OFF_REBOUND,       // 27
    RAT_DEF_REBOUND,       // 28
    RAT_OFF_LOW_POST,      // 29
    RAT_DEF_LOW_POST,      // 30
    RAT_OFF_AWARENESS,     // 31
    RAT_DEF_AWARENESS,     // 32
    RAT_CONSISTENCY,       // 33
    RAT_STAMINA,           // 34
    RAT_SPEED,             // 35
    RAT_QUICKNESS,         // 36
    RAT_STRENGTH,          // 37
    RAT_VERTICAL,          // 38
    RAT_HUSTLE,            // 39
    RAT_DURABILITY,        // 40
    RAT_POTENTIAL,         // 41
    RAT_EMOTION,           // 42
    RAT_COUNT              // 43 — sentinel
};

enum TendencyID {
    TEND_SHOT_TENDENCY = 0,
    TEND_INSIDE_SHOTS,
    TEND_CLOSE_SHOTS,
    TEND_MID_RANGE_SHOTS,
    TEND_3PT_SHOTS,
    TEND_PUTBACKS,
    TEND_DRIVE_LANE_VS_SPOT_UP,
    TEND_PULL_UP_VS_PENETRATE,
    TEND_PUMP_FAKE,
    TEND_TRIPLE_THREAT,
    TEND_TRIPLE_THREAT_SHOT,
    TEND_NO_3_THREAT_MOVES,
    TEND_STRAIGHT_DRIBBLE,
    TEND_SIZEUP,
    TEND_HESITATION,
    TEND_DRIVE_RIGHT_VS_LEFT,
    TEND_CROSSOVER,
    TEND_SPIN,
    TEND_STEP_BACK,
    TEND_HALF_SPIN,
    TEND_DOUBLE_CROSS,
    TEND_BEHIND_THE_BACK,
    TEND_HESITATION_CROSS,
    TEND_IN_AND_OUT,
    TEND_SIMPLE_DRIVE,
    TEND_ATTACK_THE_BASKET,
    TEND_PASS_OUT,
    TEND_FADEAWAYS,
    TEND_STEPBACK_JUMPER,
    TEND_SPIN_JUMPER,
    TEND_DUNK_VS_LAYUP,
    TEND_ALLEY_OOPS,
    TEND_USE_GLASS,
    TEND_DRAW_FOUL,
    TEND_CRASH,
    TEND_PICK_AND_ROLL_VS_FADE,
    TEND_POST_UP,
    TEND_TOUCHES,
    TEND_POST_SPIN, // Renamed from Spin
    TEND_POST_DRIVE, // Renamed from Drive
    TEND_AGGRESSIVE_BACKDOWN,
    TEND_LEAVE_POST,
    TEND_DROP_STEP,
    TEND_FACE_UP,
    TEND_BACK_DOWN,
    TEND_POST_SHOTS,
    TEND_POST_HOOK,
    TEND_POST_FADEAWAY,
    TEND_SHIMMY_SHOT,
    TEND_HOP_SHOT,
    TEND_FLASHY_PASSES,
    TEND_THROW_ALLEY_OOP,
    TEND_HARD_FOUL,
    TEND_TAKE_CHARGE,
    TEND_PLAY_PASS_LANE,
    TEND_ON_BAL_STL,
    TEND_CONT_SHOT,
    TEND_COMM_FOUL,
    TEND_COUNT              // 58 — sentinel
};

enum AnimationID {
    ANIM_SHT_RL_TIM = 0,
    ANIM_SHT_FORM,
    ANIM_SHT_BASE,
    ANIM_FADEAWAY,
    ANIM_CONTESTD,
    ANIM_FREE_T,
    ANIM_DR_PULL_UP,
    ANIM_SPIN_JMPR,
    ANIM_HOP_JMPR,
    ANIM_PST_FADE,
    ANIM_PST_HOOK,
    ANIM_PST_HOP_SH,
    ANIM_PST_SHM_SH,
    ANIM_PST_PRTCT,
    ANIM_PST_PRT_SPN,
    ANIM_ISO_CROSS,
    ANIM_ISO_BH_BCK,
    ANIM_ISO_SPIN,
    ANIM_ISO_HESIT,
    ANIM_LAY_UP,
    ANIM_GO_TO_DUNK,
    ANIM_DUNK2,
    ANIM_DUNK3,
    ANIM_DUNK4,
    ANIM_DUNK5,
    ANIM_DUNK6,
    ANIM_DUNK7,
    ANIM_DUNK8,
    ANIM_DUNK9,
    ANIM_DUNK10,
    ANIM_DUNK11,
    ANIM_DUNK12,
    ANIM_DUNK13,
    ANIM_DUNK14,
    ANIM_DUNK15,
    ANIM_INT_PRE_GI,
    ANIM_INT_PRE_G1,
    ANIM_INT_PRE_G2,
    ANIM_INT_PRE_T1,
    ANIM_INT_PRE_T2,
    ANIM_COUNT              // 40
};

enum VitalID {
    VITAL_POSITION = 0,
    VITAL_HEIGHT,
    VITAL_WEIGHT,
    VITAL_BIRTH_DAY,
    VITAL_BIRTH_MONTH,
    VITAL_BIRTH_YEAR,
    VITAL_HAND,
    VITAL_DUNK_HAND,
    VITAL_YEARS_PRO,
    VITAL_JERSEY_NUM,
    VITAL_TEAM_ID1,
    VITAL_TEAM_ID2,
    VITAL_CONTRACT_Y1,
    VITAL_CONTRACT_Y2,
    VITAL_CONTRACT_Y3,
    VITAL_CONTRACT_Y4,
    VITAL_CONTRACT_Y5,
    VITAL_CONTRACT_Y6,
    VITAL_CONTRACT_Y7,
    VITAL_CONTRACT_OPT,
    VITAL_NO_TRADE,
    VITAL_INJURY_TYPE,
    VITAL_INJURY_DAYS,
    VITAL_PLAY_STYLE,
    VITAL_PLAY_TYPE1,
    VITAL_PLAY_TYPE2,
    VITAL_PLAY_TYPE3,
    VITAL_PLAY_TYPE4,
    VITAL_SKIN_TONE,
    VITAL_BODY_TYPE,
    VITAL_MUSCLE_TONE,
    VITAL_HAIR_TYPE,
    VITAL_HAIR_COLOR,
    VITAL_EYE_COLOR,
    VITAL_EYEBROW,
    VITAL_MUSTACHE,
    VITAL_FCL_HAIR_CLR,
    VITAL_BEARD,
    VITAL_GOATEE,
    VITAL_SEC_POS,
    VITAL_DRAFT_YEAR,
    VITAL_DRAFT_ROUND,
    VITAL_DRAFT_PICK,
    VITAL_DRAFT_TEAM,
    VITAL_NICKNAME,
    VITAL_PLAY_INITIATOR,
    VITAL_GOES_TO_3PT,
    VITAL_PEAK_AGE_START,
    VITAL_PEAK_AGE_END,
    VITAL_POTENTIAL,
    VITAL_LOYALTY,
    VITAL_FINANCIAL_SECURITY,
    VITAL_PLAY_FOR_WINNER,

    VITAL_COUNT
};

enum GearID {
    GEAR_HEADBAND = 0,
    GEAR_HDBND_LG,
    GEAR_UNDRSHRT,
    GEAR_UNDRS_COL,
    GEAR_LEFT_ARM,
    GEAR_L_ARM_COL,
    GEAR_LEFT_ELB,
    GEAR_L_ELB_COL,
    GEAR_LEFT_WRST,
    GEAR_L_WRST_C1,
    GEAR_L_WRST_C2,
    GEAR_LEFT_FNGR,
    GEAR_L_FNGR_COL,
    GEAR_RGHT_ARM,
    GEAR_R_ARM_COL,
    GEAR_RGHT_ELB,
    GEAR_R_ELB_COL,
    GEAR_RGHT_WRST,
    GEAR_R_WRST_C1,
    GEAR_R_WRST_C2,
    GEAR_RGHT_FNGR,
    GEAR_R_FNGR_COL,
    GEAR_PRES_SHRT,
    GEAR_PRS_SH_COL,
    GEAR_LEFT_LEG,
    GEAR_L_LEG_COL,
    GEAR_LEFT_KNEE,
    GEAR_L_KNEE_COL,
    GEAR_LEFT_ANKL,
    GEAR_L_ANKL_COL,
    GEAR_RGHT_LEG,
    GEAR_R_LEG_COL,
    GEAR_RGHT_KNEE,
    GEAR_R_KNEE_COL,
    GEAR_RGHT_ANKL,
    GEAR_R_ANKL_COL,
    GEAR_SOCK_LNGH,
    GEAR_SHS_BR_LCK,
    GEAR_SHS_BRAND,
    GEAR_SHS_MODEL1,
    GEAR_SHS_MODEL2,
    GEAR_SHS_MODEL3,
    GEAR_SHS_MODEL4,
    GEAR_SHS_COL_MOD,
    GEAR_SHS_COL_H_SD,
    GEAR_SHS_COL_H_TR,
    GEAR_SHS_COL_A_SD,
    GEAR_SHS_COL_A_TR,
    GEAR_COUNT              // 48
};

class Player {
public:
    Player();
    Player(uint8_t* buffer, size_t buffer_length, size_t record_offset);

    // -- Cyberface ID (16-bit at +28 bytes from record start) ----------------
    int  get_cfid() const;
    void set_cfid(int new_cfid);

    // -- Data-driven ratings (all 43 skills) ---------------------------------
    // ID is one of the RatingID enum values (0..42)
    int  get_rating_by_id(int id) const;
    void set_rating_by_id(int id, int display_value);
    static int get_rating_count() { return static_cast<int>(RAT_COUNT); }

    // -- Legacy named accessors (kept for backward compatibility) -------------
    int  get_three_point_rating() const;
    void set_three_point_rating(int rating);
    int  get_mid_range_rating() const;
    void set_mid_range_rating(int rating);
    int  get_dunk_rating() const;
    void set_dunk_rating(int rating);
    int  get_speed_rating() const;
    void set_speed_rating(int rating);
    int  get_overall_rating() const;
    void set_overall_rating(int rating);

    // -- Player name ---------------------------------------------------------
    std::string get_first_name() const;
    std::string get_last_name() const;

    // -- Position info -------------------------------------------------------
    int get_position() const;

    // -- Data-driven tendencies (all 58) -------------------------------------
    // Index 0..57 matches RED MC's Tendencies section order
    int  get_tendency_by_id(int id) const;
    void set_tendency_by_id(int id, int value);
    static int get_tendency_count() { return 58; }

    // -- Legacy named tendency accessors (backward compat) -------------------
    int  get_tendency_stepback_shot_3pt() const;
    void set_tendency_stepback_shot_3pt(int val);
    int  get_tendency_driving_layup() const;
    void set_tendency_driving_layup(int val);
    int  get_tendency_standing_dunk() const;
    void set_tendency_standing_dunk(int val);
    int  get_tendency_driving_dunk() const;
    void set_tendency_driving_dunk(int val);
    int  get_tendency_post_hook() const;
    void set_tendency_post_hook(int val);

    // -- Gear / Accessories (48 fields) --------------------------------------
    uint32_t get_gear_by_id(int id) const;
    void set_gear_by_id(int id, uint32_t value);
    static int get_gear_count() { return 48; }

    // -- Data-driven animations (all 40) -------------------------------------
    // Starts exactly at Byte 193
    int  get_animation_by_id(int id) const;
    void set_animation_by_id(int id, int value);
    static int get_animation_count() { return 40; }

    // -- Data-driven bio/vitals (9 fields) -----------------------------------
    int  get_vital_by_id(int id) const;
    void set_vital_by_id(int id, int value);
    static int get_vital_count() { return 9; }

    // -- Hot Zones (2-bit values, 14 zones) ----------------------------------
    int  get_hot_zone(int zone_id) const;   // zone_id: 0..13
    void set_hot_zone(int zone_id, int val);
    static int get_hot_zone_count() { return 14; }

    // -- Signature Skills (6-bit packed, 5 slots) ----------------------------
    int  get_sig_skill(int slot) const;     // slot: 0..4
    void set_sig_skill(int slot, int val);
    static int get_sig_skill_count() { return 5; }

    // -- Record context ------------------------------------------------------
    size_t get_record_offset() const { return record_offset_; }

private:
    uint8_t* buffer_;
    size_t   buffer_length_;
    size_t   record_offset_;   // Absolute byte offset of this player's record

    // Helpers — byte-aligned
    uint8_t  read_byte_at(size_t offset) const;
    void     write_byte_at(size_t offset, uint8_t value);
    uint16_t read_u16_le(size_t offset) const;
    void     write_u16_le(size_t offset, uint16_t value);

    // Helpers — bit-packed (uses BitStream internally)
    uint32_t read_bits_at(size_t byte_off, int bit_off, int count) const;
    void     write_bits_at(size_t byte_off, int bit_off, int count, uint32_t value);

    // Ratings conversion
    static int  raw_to_display(uint8_t raw);
    static uint8_t display_to_raw(int display);
};

// ---------------------------------------------------------------------------
// Team — represents one team record in the roster file
// ---------------------------------------------------------------------------

class Team {
public:
    Team();
    Team(uint8_t* buffer, size_t buffer_length, size_t record_offset);

    // -- Basic Identifiers --
    int get_id() const;              // e.g. City ID or Team ID
    std::string get_name() const;    
    std::string get_city() const;    
    std::string get_abbr() const;

    void set_name(const std::string& name);
    void set_city(const std::string& city);
    void set_abbr(const std::string& abbr);

    // -- Colors (Hex values typically stored as ARGB or separate bytes) --
    uint32_t get_color1() const;
    uint32_t get_color2() const;
    void set_color1(uint32_t argb);
    void set_color2(uint32_t argb);

    // -- Rosters (Arrays of player indices) --
    // Returns the 16-bit player index for the given roster slot (0-14, where 0-4 are usually starters)
    int get_roster_player_id(int index) const; 
    void set_roster_player_id(int index, int player_id);

    // -- Record context --
    size_t get_record_offset() const { return record_offset_; }

private:
    uint8_t* buffer_;
    size_t   buffer_length_;
    size_t   record_offset_;

    // Helpers
    uint8_t  read_byte_at(size_t offset) const;
    void     write_byte_at(size_t offset, uint8_t value);
    uint16_t read_u16_le(size_t offset) const;
    void     write_u16_le(size_t offset, uint16_t value);
    uint32_t read_u32_le(size_t offset) const;
    void     write_u32_le(size_t offset, uint32_t value);
};

// ---------------------------------------------------------------------------
// RosterEditor — top-level editor managing the file buffer and player table
// ---------------------------------------------------------------------------
class RosterEditor {
public:
    RosterEditor();
    ~RosterEditor();

    // Initialize with a raw buffer (from Wasm heap or direct memory).
    // Does NOT take ownership — caller manages the memory.
    void init(size_t buffer_ptr, int buffer_length);

    // Player access
    int     get_player_count() const;
    Player  get_player(int index) const;

    // Team access
    int     get_team_count() const;
    Team    get_team(int index) const;

    // Recalculate the CRC32 checksum and overwrite the first 4 bytes.
    void save_and_recalculate_checksum();

    // Get a pointer to the buffer (for JS to read back the modified data).
    size_t    get_buffer_ptr() const;
    int       get_buffer_length() const;

private:
    uint8_t* buffer_;
    size_t   buffer_length_;

    // Discovered table locations
    size_t   player_table_offset_;
    int      player_count_;
    size_t   player_record_size_;

    size_t   team_table_offset_;
    int      team_count_;
    size_t   team_record_size_;

    // Internal discovery
    void discover_player_table();
    void discover_team_table();
};
