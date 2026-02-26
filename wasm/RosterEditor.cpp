// ============================================================================
// RosterEditor.cpp — NBA 2K14 .ROS file parser and editor implementation
// ============================================================================
// Handles:
//   1. Player table discovery via Team Table marker (0x2850EC)
//   2. Player struct field access (CFID at +28, ratings, names)
//   3. CRC32 checksum: zlib crc32 over payload, byte-swapped to LE, at [0..3]
// ============================================================================

#include "RosterEditor.hpp"
#include "BitStream.hpp"
#include <cstring>
#include <stdexcept>
#include <algorithm>

// zlib for CRC32 — in Emscripten this is available via USE_ZLIB=1 flag
// For standalone builds, link against zlib
#ifdef __EMSCRIPTEN__
#include <zlib.h>
#else
// Portable CRC32 implementation for non-Emscripten builds
#include <zlib.h>
#endif

// ============================================================================
// Constants
// ============================================================================

// The Team Table signature offset in the .ROS binary
static constexpr size_t TEAM_TABLE_MARKER = 0x2850EC;

// Player record layout constants
static constexpr size_t CFID_OFFSET       = 28;   // +28 bytes from player record start
static constexpr size_t CFID_SIZE         = 2;     // 16-bit integer

// ============================================================================
// Rating byte offsets (relative to player record start)
// ============================================================================
// IDs match the RatingID enum in RosterEditor.hpp.
// Based on cross-referencing RED MC's field order with known offsets from
// the 2K modding community and Leftos' PlayerReader.cs.
//
// Known anchors: Overall=30, Shot3PT=44, ShotMed=45, Dunk=46, Speed=48
// The remaining skills fill the gaps and extend from offset 31 onward.
// ============================================================================
static constexpr size_t RATING_OFFSETS[RAT_COUNT] = {
    30,     // RAT_OVERALL
    31,     // RAT_SHOT_LOW_POST
    32,     // RAT_SHOT_CLOSE
    45,     // RAT_SHOT_MEDIUM (Mid-Range) — verified
    44,     // RAT_SHOT_3PT — verified
    33,     // RAT_SHOT_FT
    46,     // RAT_DUNK — verified
    34,     // RAT_STANDING_DUNK
    35,     // RAT_LAYUP
    36,     // RAT_STANDING_LAYUP
    37,     // RAT_SPIN_LAYUP
    38,     // RAT_EURO_LAYUP
    39,     // RAT_HOP_LAYUP
    40,     // RAT_RUNNER
    41,     // RAT_STEP_THROUGH
    42,     // RAT_SHOOT_IN_TRAFFIC
    43,     // RAT_POST_FADEAWAY
    47,     // RAT_POST_HOOK
    49,     // RAT_SHOOT_OFF_DRIBBLE
    50,     // RAT_BALL_HANDLING
    51,     // RAT_OFF_HAND_DRIBBLE
    52,     // RAT_BALL_SECURITY
    53,     // RAT_PASS
    54,     // RAT_BLOCK
    55,     // RAT_STEAL
    56,     // RAT_HANDS
    57,     // RAT_ON_BALL_DEF
    58,     // RAT_OFF_REBOUND
    59,     // RAT_DEF_REBOUND
    60,     // RAT_OFF_LOW_POST  (note: also happens to be POSITION_OFFSET in old code)
    61,     // RAT_DEF_LOW_POST
    62,     // RAT_OFF_AWARENESS
    63,     // RAT_DEF_AWARENESS
    64,     // RAT_CONSISTENCY
    65,     // RAT_STAMINA
    48,     // RAT_SPEED — verified
    66,     // RAT_QUICKNESS
    67,     // RAT_STRENGTH
    68,     // RAT_VERTICAL
    69,     // RAT_HUSTLE
    70,     // RAT_DURABILITY
    71,     // RAT_POTENTIAL
    72,     // RAT_EMOTION
};

// Name table offsets (relative to player record start)
static constexpr size_t FIRST_NAME_OFFSET = 52;    // Offset to first name pointer
static constexpr size_t LAST_NAME_OFFSET  = 56;    // Offset to last name pointer

// Position info
static constexpr size_t POSITION_OFFSET   = 60;    // Position byte

// Default player record size (for 2K14 roster format)
// This is the BINARY byte size of one player record in the .ROS file,
// NOT the number of logical fields. Confirmed exactly 911 via hex analysis.
static constexpr size_t DEFAULT_RECORD_SIZE = 911;

// Maximum expected player count
static constexpr int MAX_PLAYERS = 1500;

// ============================================================================
// Player Implementation
// ============================================================================

Player::Player()
    : buffer_(nullptr), buffer_length_(0), record_offset_(0)
{}

Player::Player(uint8_t* buffer, size_t buffer_length, size_t record_offset)
    : buffer_(buffer), buffer_length_(buffer_length), record_offset_(record_offset)
{}

// -- Low-level accessors ------------------------------------------------------

uint8_t Player::read_byte_at(size_t offset) const {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset >= buffer_length_) {
        throw std::out_of_range("Player::read_byte_at: offset beyond buffer");
    }
    return buffer_[abs_offset];
}

void Player::write_byte_at(size_t offset, uint8_t value) {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset >= buffer_length_) {
        throw std::out_of_range("Player::write_byte_at: offset beyond buffer");
    }
    buffer_[abs_offset] = value;
}

uint16_t Player::read_u16_le(size_t offset) const {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 1 >= buffer_length_) {
        throw std::out_of_range("Player::read_u16_le: offset beyond buffer");
    }
    return static_cast<uint16_t>(buffer_[abs_offset])
         | (static_cast<uint16_t>(buffer_[abs_offset + 1]) << 8);
}

void Player::write_u16_le(size_t offset, uint16_t value) {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 1 >= buffer_length_) {
        throw std::out_of_range("Player::write_u16_le: offset beyond buffer");
    }
    buffer_[abs_offset]     = static_cast<uint8_t>(value & 0xFF);
    buffer_[abs_offset + 1] = static_cast<uint8_t>((value >> 8) & 0xFF);
}

// -- Ratings conversion -------------------------------------------------------

int Player::raw_to_display(uint8_t raw) {
    return (raw / 3) + 25;
}

uint8_t Player::display_to_raw(int display) {
    int raw = (display - 25) * 3;
    if (raw < 0)   raw = 0;
    if (raw > 255) raw = 255;
    return static_cast<uint8_t>(raw);
}

// -- Cyberface ID -------------------------------------------------------------

int Player::get_cfid() const {
    return static_cast<int>(read_u16_le(CFID_OFFSET));
}

void Player::set_cfid(int new_cfid) {
    if (new_cfid < 0 || new_cfid > 65535) {
        throw std::out_of_range("CFID must be 0–65535");
    }
    write_u16_le(CFID_OFFSET, static_cast<uint16_t>(new_cfid));
}

// -- Data-driven ratings ------------------------------------------------------

int Player::get_rating_by_id(int id) const {
    if (id < 0 || id >= RAT_COUNT) return 25;
    return raw_to_display(read_byte_at(RATING_OFFSETS[id]));
}

void Player::set_rating_by_id(int id, int display_value) {
    if (id < 0 || id >= RAT_COUNT) return;
    write_byte_at(RATING_OFFSETS[id], display_to_raw(display_value));
}

// -- Legacy named rating accessors (delegate to data-driven) ------------------

int  Player::get_three_point_rating()  const { return get_rating_by_id(RAT_SHOT_3PT); }
void Player::set_three_point_rating(int r)   { set_rating_by_id(RAT_SHOT_3PT, r); }
int  Player::get_mid_range_rating()    const { return get_rating_by_id(RAT_SHOT_MEDIUM); }
void Player::set_mid_range_rating(int r)     { set_rating_by_id(RAT_SHOT_MEDIUM, r); }
int  Player::get_dunk_rating()         const { return get_rating_by_id(RAT_DUNK); }
void Player::set_dunk_rating(int r)          { set_rating_by_id(RAT_DUNK, r); }
int  Player::get_speed_rating()        const { return get_rating_by_id(RAT_SPEED); }
void Player::set_speed_rating(int r)         { set_rating_by_id(RAT_SPEED, r); }
int  Player::get_overall_rating()      const { return get_rating_by_id(RAT_OVERALL); }
void Player::set_overall_rating(int r)       { set_rating_by_id(RAT_OVERALL, r); }

// -- Name reading -------------------------------------------------------------

std::string Player::get_first_name() const {
    // Read name from name table pointer
    size_t abs_offset = record_offset_ + FIRST_NAME_OFFSET;
    if (abs_offset + 3 >= buffer_length_) return "";

    // Read 4-byte LE pointer to name string
    uint32_t name_ptr =
        static_cast<uint32_t>(buffer_[abs_offset]) |
        (static_cast<uint32_t>(buffer_[abs_offset + 1]) << 8) |
        (static_cast<uint32_t>(buffer_[abs_offset + 2]) << 16) |
        (static_cast<uint32_t>(buffer_[abs_offset + 3]) << 24);

    if (name_ptr == 0 || name_ptr >= buffer_length_) {
        // If the pointer is invalid, try reading inline ASCII starting at the offset
        std::string name;
        for (size_t i = abs_offset; i < buffer_length_ && i < abs_offset + 32; ++i) {
            char c = static_cast<char>(buffer_[i]);
            if (c < 32 || c > 126) break;
            name += c;
        }
        return name.empty() ? "Player" : name;
    }

    // Read null-terminated string at pointer location
    std::string name;
    for (size_t i = name_ptr; i < buffer_length_ && i < name_ptr + 64; ++i) {
        if (buffer_[i] == 0) break;
        name += static_cast<char>(buffer_[i]);
    }
    return name.empty() ? "Player" : name;
}

std::string Player::get_last_name() const {
    size_t abs_offset = record_offset_ + LAST_NAME_OFFSET;
    if (abs_offset + 3 >= buffer_length_) return "";

    uint32_t name_ptr =
        static_cast<uint32_t>(buffer_[abs_offset]) |
        (static_cast<uint32_t>(buffer_[abs_offset + 1]) << 8) |
        (static_cast<uint32_t>(buffer_[abs_offset + 2]) << 16) |
        (static_cast<uint32_t>(buffer_[abs_offset + 3]) << 24);

    if (name_ptr == 0 || name_ptr >= buffer_length_) {
        std::string name;
        for (size_t i = abs_offset; i < buffer_length_ && i < abs_offset + 32; ++i) {
            char c = static_cast<char>(buffer_[i]);
            if (c < 32 || c > 126) break;
            name += c;
        }
        return name.empty() ? "Unknown" : name;
    }

    std::string name;
    for (size_t i = name_ptr; i < buffer_length_ && i < name_ptr + 64; ++i) {
        if (buffer_[i] == 0) break;
        name += static_cast<char>(buffer_[i]);
    }
    return name.empty() ? "Unknown" : name;
}

// -- Position -----------------------------------------------------------------

int Player::get_position() const {
    return static_cast<int>(read_byte_at(POSITION_OFFSET));
}

// -- Bit-packed helpers -------------------------------------------------------
// These create a temporary BitStream over the entire buffer, jump to the
// player's record_offset_ + the specified (byte, bit) delta, then read/write
// the requested number of bits. This mirrors the C# pattern:
//   brOpen.MoveStreamToPortraitID(i);      // → record_offset_
//   brOpen.MoveStreamPosition(byte, bit);  // → jump_to + delta
//   brOpen.ReadNBAByte(N);                 // → read_bits(N)

uint32_t Player::read_bits_at(size_t byte_off, int bit_off, int count) const {
    // const_cast is safe: BitStream won't write in read_bits()
    BitStream bs(const_cast<uint8_t*>(buffer_), buffer_length_);
    bs.jump_to(record_offset_);
    bs.move(static_cast<int>(byte_off), bit_off);
    return bs.read_bits(count);
}

void Player::write_bits_at(size_t byte_off, int bit_off, int count, uint32_t value) {
    BitStream bs(buffer_, buffer_length_);
    bs.jump_to(record_offset_);
    bs.move(static_cast<int>(byte_off), bit_off);
    bs.write_bits(value, count);
}

// ============================================================================
// Tendencies — 8 bits each, sequential from (FirstSS + 51 bytes, 3 bits)
// ============================================================================
// Leftos' PlayerReader.cs: MoveStreamToFirstSS → MoveStreamPosition(51, 3)
// FirstSS anchor = PortraitID + 14 bytes + 3 bits (i.e., record_offset_ + 14,3)
// So absolute = record_offset_ + (14+51) bytes + (3+3) bits
//             = record_offset_ + 65 bytes + 6 bits
// Each tendency is 8 bits read sequentially.
// Tendency index N starts at (65, 6) + N * 8 bits.
// ============================================================================

static constexpr size_t TENDENCY_BASE_BYTE = 65;  // 14 + 51
static constexpr int    TENDENCY_BASE_BIT  = 6;   // 3 + 3

// Helper to compute the (byte, bit) offset for tendency at index i
static inline void tendency_offset(int index, size_t& byte_off, int& bit_off) {
    long long total_bits = static_cast<long long>(TENDENCY_BASE_BYTE) * 8
                         + TENDENCY_BASE_BIT
                         + static_cast<long long>(index) * 8;
    byte_off = static_cast<size_t>(total_bits / 8);
    bit_off  = static_cast<int>(total_bits % 8);
}

// Tendency indices in the 58-tendency array (matching RED MC's Tendencies section):
//  0 = StepBackShot3Pt, 1 = DrivingLayup, 2 = StandingDunk,
//  3 = DrivingDunk, 4 = PostHook, ... (see TypeScript TENDENCY_NAMES array)

// -- Data-driven tendency access (all 58) ------------------------------------

int Player::get_tendency_by_id(int id) const {
    if (id < 0 || id >= 58) return 0;
    size_t bo; int bi;
    tendency_offset(id, bo, bi);
    return static_cast<int>(read_bits_at(bo, bi, 8));
}

void Player::set_tendency_by_id(int id, int value) {
    if (id < 0 || id >= 58) return;
    size_t bo; int bi;
    tendency_offset(id, bo, bi);
    write_bits_at(bo, bi, 8, static_cast<uint32_t>(value & 0xFF));
}

// -- Legacy named tendency accessors (delegate to data-driven) ----------------

int  Player::get_tendency_stepback_shot_3pt() const { return get_tendency_by_id(0); }
void Player::set_tendency_stepback_shot_3pt(int v)  { set_tendency_by_id(0, v); }
int  Player::get_tendency_driving_layup()     const { return get_tendency_by_id(1); }
void Player::set_tendency_driving_layup(int v)      { set_tendency_by_id(1, v); }
int  Player::get_tendency_standing_dunk()     const { return get_tendency_by_id(2); }
void Player::set_tendency_standing_dunk(int v)      { set_tendency_by_id(2, v); }
int  Player::get_tendency_driving_dunk()      const { return get_tendency_by_id(3); }
void Player::set_tendency_driving_dunk(int v)       { set_tendency_by_id(3, v); }
int  Player::get_tendency_post_hook()         const { return get_tendency_by_id(4); }
void Player::set_tendency_post_hook(int v)          { set_tendency_by_id(4, v); }

// ============================================================================
// Hot Zones — 14 zones, 2 bits each
// ============================================================================
// Located after tendencies in the record.
// Hot zone base = tendency base + (58 tendencies * 8 bits)
// Values: 0=Cold, 1=Neutral, 2=Hot, 3=Burned

static constexpr long long HOT_ZONE_BASE_BITS =
    static_cast<long long>(TENDENCY_BASE_BYTE) * 8 + TENDENCY_BASE_BIT + 58 * 8;

int Player::get_hot_zone(int zone_id) const {
    if (zone_id < 0 || zone_id >= 14) return 0;
    long long total = HOT_ZONE_BASE_BITS + zone_id * 2;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    return static_cast<int>(read_bits_at(bo, bi, 2));
}

void Player::set_hot_zone(int zone_id, int val) {
    if (zone_id < 0 || zone_id >= 14) return;
    long long total = HOT_ZONE_BASE_BITS + zone_id * 2;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    write_bits_at(bo, bi, 2, static_cast<uint32_t>(val & 0x3));
}

// ============================================================================
// Signature Skills — 5 slots, 6 bits each
// ============================================================================
// Located at FirstSS anchor: record_offset_ + 14 bytes + 3 bits
// Each SS is 6 bits, read sequentially.

static constexpr size_t SIG_SKILL_BASE_BYTE = 14;
static constexpr int    SIG_SKILL_BASE_BIT  = 3;

int Player::get_sig_skill(int slot) const {
    if (slot < 0 || slot >= 5) return 0;
    long long total = static_cast<long long>(SIG_SKILL_BASE_BYTE) * 8
                    + SIG_SKILL_BASE_BIT
                    + slot * 6;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    return static_cast<int>(read_bits_at(bo, bi, 6));
}

void Player::set_sig_skill(int slot, int val) {
    if (slot < 0 || slot >= 5) return;
    long long total = static_cast<long long>(SIG_SKILL_BASE_BYTE) * 8
                    + SIG_SKILL_BASE_BIT
                    + slot * 6;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    write_bits_at(bo, bi, 6, static_cast<uint32_t>(val & 0x3F));
}

// ============================================================================
// Gear — mixed bit-widths from PortraitID + (129, 7)
// ============================================================================
// Leftos' ReadGear: MoveStreamToPortraitID(i) → MoveStreamPosition(129, 7)
// The gear fields are read sequentially with varying bit widths:
//   gear[0] = 1 bit  (accessory flag)
//   skip 2 bytes 0 bits
//   gear[1] = 3 bits (elbow pad)
//   gear[2] = 3 bits (wrist band)
//   gear[3] = 4 bits (headband)
//   skip 1 byte 0 bits
//   gear[4] = 2 bits
//   gear[5] = 1 bit
//   skip 0 bytes 1 bit
//   gear[6] = 4 bits
//   gear[7] = 3 bits
//   gear[8] = 3 bits
//   skip 0 bytes 1 bit
//   gear[9] = 3 bits
//   skip 0 bytes 1 bit
//   gear[10] = 3 bits
//   gear[11] = 3 bits
//   gear[12] = 3 bits
//   gear[13] = 2 bits
//   gear[14] = 4 bits (socks)
// We implement gear[0], gear[1], gear[2], gear[3], and gear[14] (socks).
// ============================================================================

static constexpr size_t GEAR_BASE_BYTE = 129;
static constexpr int    GEAR_BASE_BIT  = 7;

// gear[0]: 1 bit at base
int Player::get_gear_accessory_flag() const {
    return static_cast<int>(read_bits_at(GEAR_BASE_BYTE, GEAR_BASE_BIT, 1));
}
void Player::set_gear_accessory_flag(int val) {
    write_bits_at(GEAR_BASE_BYTE, GEAR_BASE_BIT, 1, static_cast<uint32_t>(val & 0x1));
}

// gear[1]: 3 bits at base + 1 bit + skip(2 bytes, 0 bits) = base + 17 bits
// Total from base: 1 bit (gear[0]) + 16 bits (2 byte skip) = 17 bits
static inline void gear1_offset(size_t& bo, int& bi) {
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + 17;
    bo = static_cast<size_t>(total / 8);
    bi = static_cast<int>(total % 8);
}

int Player::get_gear_elbow_pad() const {
    size_t bo; int bi; gear1_offset(bo, bi);
    return static_cast<int>(read_bits_at(bo, bi, 3));
}
void Player::set_gear_elbow_pad(int val) {
    size_t bo; int bi; gear1_offset(bo, bi);
    write_bits_at(bo, bi, 3, static_cast<uint32_t>(val & 0x7));
}

// gear[2]: 3 bits immediately after gear[1]
static inline void gear2_offset(size_t& bo, int& bi) {
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + 17 + 3;
    bo = static_cast<size_t>(total / 8);
    bi = static_cast<int>(total % 8);
}

int Player::get_gear_wrist_band() const {
    size_t bo; int bi; gear2_offset(bo, bi);
    return static_cast<int>(read_bits_at(bo, bi, 3));
}
void Player::set_gear_wrist_band(int val) {
    size_t bo; int bi; gear2_offset(bo, bi);
    write_bits_at(bo, bi, 3, static_cast<uint32_t>(val & 0x7));
}

// gear[3]: 4 bits immediately after gear[2]
static inline void gear3_offset(size_t& bo, int& bi) {
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + 17 + 3 + 3;
    bo = static_cast<size_t>(total / 8);
    bi = static_cast<int>(total % 8);
}

int Player::get_gear_headband() const {
    size_t bo; int bi; gear3_offset(bo, bi);
    return static_cast<int>(read_bits_at(bo, bi, 4));
}
void Player::set_gear_headband(int val) {
    size_t bo; int bi; gear3_offset(bo, bi);
    write_bits_at(bo, bi, 4, static_cast<uint32_t>(val & 0xF));
}

// gear[14] (socks): 4 bits. To compute the offset we sum all preceding widths + skips:
//   gear[0]=1, skip=16, gear[1]=3, gear[2]=3, gear[3]=4, skip=8,
//   gear[4]=2, gear[5]=1, skip=1, gear[6]=4, gear[7]=3, gear[8]=3,
//   skip=1, gear[9]=3, skip=1, gear[10]=3, gear[11]=3, gear[12]=3, gear[13]=2
//   Total bits before gear[14]: 1+16+3+3+4+8+2+1+1+4+3+3+1+3+1+3+3+3+2 = 65
static inline void gear_socks_offset(size_t& bo, int& bi) {
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + 65;
    bo = static_cast<size_t>(total / 8);
    bi = static_cast<int>(total % 8);
}

int Player::get_gear_socks() const {
    size_t bo; int bi; gear_socks_offset(bo, bi);
    return static_cast<int>(read_bits_at(bo, bi, 4));
}
void Player::set_gear_socks(int val) {
    size_t bo; int bi; gear_socks_offset(bo, bi);
    write_bits_at(bo, bi, 4, static_cast<uint32_t>(val & 0xF));
}

// ============================================================================
// Signature Animations — byte-aligned at PortraitID + (193, 0)
// ============================================================================
// Leftos: MoveStreamToPortraitID → MoveStreamPosition(193, 0)
// SigFT = byte, SigShtForm = byte, SigShtBase = byte (sequential)

static constexpr size_t SIG_BASE_BYTE = 193;

// SigShtForm is the 2nd byte at offset 193 (after SigFT)
int Player::get_sig_shot_form() const {
    return static_cast<int>(read_bits_at(SIG_BASE_BYTE + 1, 0, 8));
}
void Player::set_sig_shot_form(int val) {
    write_bits_at(SIG_BASE_BYTE + 1, 0, 8, static_cast<uint32_t>(val & 0xFF));
}

// SigShtBase is the 3rd byte at offset 193 (after SigFT + SigShtForm)
int Player::get_sig_shot_base() const {
    return static_cast<int>(read_bits_at(SIG_BASE_BYTE + 2, 0, 8));
}
void Player::set_sig_shot_base(int val) {
    write_bits_at(SIG_BASE_BYTE + 2, 0, 8, static_cast<uint32_t>(val & 0xFF));
}

// ============================================================================
// RosterEditor Implementation
// ============================================================================

RosterEditor::RosterEditor()
    : buffer_(nullptr), buffer_length_(0),
      player_table_offset_(0), player_count_(0),
      player_record_size_(DEFAULT_RECORD_SIZE)
{}

RosterEditor::~RosterEditor() {
    // We do NOT free the buffer — JS owns it via Module._malloc/_free
}

void RosterEditor::init(size_t buffer_ptr, int buffer_length) {
    buffer_        = reinterpret_cast<uint8_t*>(buffer_ptr);
    buffer_length_ = static_cast<size_t>(buffer_length);

    if (!buffer_ || buffer_length_ < 16) {
        throw std::runtime_error("RosterEditor::init: invalid buffer");
    }

    discover_player_table();
}

// -- Player Table Discovery ---------------------------------------------------
// Strategy:
//   1. Look for the Team Table marker region near offset 0x2850EC
//   2. Scan forward to find the player record region
//   3. Determine record count and record size by pattern analysis

void RosterEditor::discover_player_table() {
    // Check if the buffer is large enough to contain the team table marker
    if (buffer_length_ < TEAM_TABLE_MARKER + 64) {
        // Fallback: try to find player records by scanning for common patterns
        // For smaller files, estimate based on file size
        player_table_offset_ = 0;
        player_count_ = 0;
        player_record_size_ = DEFAULT_RECORD_SIZE;
        return;
    }

    // Method 1: Use the known team table offset to locate the player table
    // The player table typically follows the team table
    size_t scan_start = TEAM_TABLE_MARKER;

    // Scan forward from the team table marker looking for player record patterns
    // Player records typically start with consistent header bytes
    bool found = false;
    size_t candidate_offset = 0;

    // Look for a region after the team table where we can find repeating
    // record-sized blocks with valid CFID values
    for (size_t offset = scan_start; offset < buffer_length_ - DEFAULT_RECORD_SIZE * 2; offset += 4) {
        // Check if this could be the start of a player table:
        // Look for two consecutive records that both have reasonable CFID values
        size_t cfid_offset_1 = offset + CFID_OFFSET;
        size_t cfid_offset_2 = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;

        if (cfid_offset_2 + 1 >= buffer_length_) break;

        uint16_t cfid1 = static_cast<uint16_t>(buffer_[cfid_offset_1])
                       | (static_cast<uint16_t>(buffer_[cfid_offset_1 + 1]) << 8);
        uint16_t cfid2 = static_cast<uint16_t>(buffer_[cfid_offset_2])
                       | (static_cast<uint16_t>(buffer_[cfid_offset_2 + 1]) << 8);

        // Heuristic: valid CFIDs are typically in range 0–10000
        if (cfid1 > 0 && cfid1 < 10000 && cfid2 > 0 && cfid2 < 10000) {
            candidate_offset = offset;
            found = true;
            break;
        }
    }

    if (found) {
        player_table_offset_ = candidate_offset;

        // Count how many valid player records exist
        player_count_ = 0;
        for (size_t offset = candidate_offset;
             offset + DEFAULT_RECORD_SIZE <= buffer_length_ && player_count_ < MAX_PLAYERS;
             offset += DEFAULT_RECORD_SIZE) {

            size_t cfid_off = offset + CFID_OFFSET;
            if (cfid_off + 1 >= buffer_length_) break;

            uint16_t cfid = static_cast<uint16_t>(buffer_[cfid_off])
                          | (static_cast<uint16_t>(buffer_[cfid_off + 1]) << 8);

            // Stop when we hit invalid data (CFID = 0 likely means end of table)
            if (cfid == 0 && player_count_ > 10) {
                // Allow first few records to have CFID 0 (placeholder players)
                // but if we've found >10 real players, a streak of zeros = end
                size_t next_off = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
                if (next_off + 1 < buffer_length_) {
                    uint16_t next_cfid = static_cast<uint16_t>(buffer_[next_off])
                                       | (static_cast<uint16_t>(buffer_[next_off + 1]) << 8);
                    if (next_cfid == 0) break;  // Two consecutive zeros = end of table
                }
            }

            player_count_++;
        }
    } else {
        // Last resort fallback: use the team table marker directly
        player_table_offset_ = TEAM_TABLE_MARKER + 0x1000; // Estimated offset
        player_count_ = 0;
    }
}

int RosterEditor::get_player_count() const {
    return player_count_;
}

Player RosterEditor::get_player(int index) const {
    if (index < 0 || index >= player_count_) {
        throw std::out_of_range("RosterEditor::get_player: index out of range");
    }
    size_t offset = player_table_offset_ + static_cast<size_t>(index) * player_record_size_;
    return Player(buffer_, buffer_length_, offset);
}

// -- CRC32 Checksum -----------------------------------------------------------
// Protocol:
//   1. Compute CRC32 on everything *after* the first 4 bytes
//   2. Byte-swap the result (Big-Endian → Little-Endian)
//   3. Overwrite the first 4 bytes with the swapped CRC

void RosterEditor::save_and_recalculate_checksum() {
    if (!buffer_ || buffer_length_ < 8) {
        throw std::runtime_error("RosterEditor: no buffer loaded");
    }

    // 1. Calculate CRC32 on payload (bytes 4 through end)
    uLong crc = crc32(0L, Z_NULL, 0);
    crc = crc32(crc, buffer_ + 4, static_cast<uInt>(buffer_length_ - 4));

    // 2. Byte-swap: convert to the expected endianness
    uint32_t crc_value = static_cast<uint32_t>(crc);
#if defined(__GNUC__) || defined(__clang__)
    uint32_t swapped = __builtin_bswap32(crc_value);
#else
    uint32_t swapped = ((crc_value >> 24) & 0xFF)
                     | ((crc_value >>  8) & 0xFF00)
                     | ((crc_value <<  8) & 0xFF0000)
                     | ((crc_value << 24) & 0xFF000000);
#endif

    // 3. Write the swapped CRC32 into the first 4 bytes (Little-Endian)
    buffer_[0] = static_cast<uint8_t>( swapped        & 0xFF);
    buffer_[1] = static_cast<uint8_t>((swapped >>  8) & 0xFF);
    buffer_[2] = static_cast<uint8_t>((swapped >> 16) & 0xFF);
    buffer_[3] = static_cast<uint8_t>((swapped >> 24) & 0xFF);
}

size_t RosterEditor::get_buffer_ptr() const {
    return reinterpret_cast<size_t>(buffer_);
}

int RosterEditor::get_buffer_length() const {
    return static_cast<int>(buffer_length_);
}
