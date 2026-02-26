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

    // -- Gear / Accessories (mixed bit-widths) -------------------------------
    int  get_gear_accessory_flag() const;
    void set_gear_accessory_flag(int val);
    int  get_gear_elbow_pad() const;
    void set_gear_elbow_pad(int val);
    int  get_gear_wrist_band() const;
    void set_gear_wrist_band(int val);
    int  get_gear_headband() const;
    void set_gear_headband(int val);
    int  get_gear_socks() const;
    void set_gear_socks(int val);

    // -- Signature Animations (byte-aligned at known offset) -----------------
    int  get_sig_shot_form() const;
    void set_sig_shot_form(int val);
    int  get_sig_shot_base() const;
    void set_sig_shot_base(int val);

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

    // Internal discovery
    void discover_player_table();
};
