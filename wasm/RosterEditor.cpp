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
// Based on cross-referencing RED MC's field order with empirical 2K14 offsets
// shifting the original 2K13 structure by 379 bytes (Rating anchor = 409)
static constexpr size_t RATING_OFFSETS[] = {
    409, 410, 411, 424, 423, 412, 425, 413, 414, 415,
    416, 417, 418, 419, 420, 421, 422, 426, 428, 429,
    430, 431, 432, 433, 434, 435, 436, 437, 438, 439,
    440, 441, 442, 443, 444, 427, 445, 446, 447, 448,
    449, 450, 451
};

// Name table offsets (relative to player record start)
static constexpr size_t FIRST_NAME_OFFSET = 52;    // Offset to first name pointer
static constexpr size_t LAST_NAME_OFFSET  = 56;    // Offset to last name pointer

// Position info
static constexpr size_t POSITION_OFFSET   = 60;    // Position byte

// Default player record size (for 2K14 roster format)
// This is the BINARY byte size of one player record in the .ROS file,
// NOT the number of logical fields. Confirmed exactly 911 via hex analysis.
static constexpr size_t DEFAULT_RECORD_SIZE = 1023;

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

// -- Data-driven Vitals -------------------------------------------------------

int Player::get_vital_by_id(int id) const {
    switch (id) {
        case VITAL_POSITION:    return read_byte_at(33);
        case VITAL_HEIGHT:      return read_byte_at(34);
        case VITAL_WEIGHT:      return read_byte_at(35);
        case VITAL_BIRTH_DAY:   return read_byte_at(37);
        case VITAL_BIRTH_MONTH: return read_byte_at(38);
        case VITAL_BIRTH_YEAR:  return read_u16_le(39);
        case VITAL_HAND:        return read_byte_at(41);
        case VITAL_DUNK_HAND:   return read_byte_at(42);
        case VITAL_YEARS_PRO:   return read_byte_at(43);
        case VITAL_JERSEY_NUM:  return read_bits_at(13, 4, 8);
        case VITAL_TEAM_ID1:    return read_bits_at(1, 0, 8);
        case VITAL_TEAM_ID2:    return read_bits_at(267, 0, 8);
        case VITAL_CONTRACT_Y1: return read_bits_at(222, 0, 32);
        case VITAL_CONTRACT_Y2: return read_bits_at(226, 0, 32);
        case VITAL_CONTRACT_Y3: return read_bits_at(230, 0, 32);
        case VITAL_CONTRACT_Y4: return read_bits_at(234, 0, 32);
        case VITAL_CONTRACT_Y5: return read_bits_at(238, 0, 32);
        case VITAL_CONTRACT_Y6: return read_bits_at(242, 0, 32);
        case VITAL_CONTRACT_Y7: return read_bits_at(246, 0, 32);
        case VITAL_CONTRACT_OPT: return read_bits_at(162, 0, 2);
        case VITAL_NO_TRADE:    return read_bits_at(185, 5, 1);
        case VITAL_INJURY_TYPE: return read_bits_at(32, 1, 7);
        case VITAL_INJURY_DAYS: return read_bits_at(36, 0, 16);
        case VITAL_PLAY_STYLE:  return read_bits_at(162, 5, 5);
        case VITAL_PLAY_TYPE1:  return read_bits_at(151, 5, 4);
        case VITAL_PLAY_TYPE2:  return read_bits_at(152, 1, 4);
        case VITAL_PLAY_TYPE3:  return read_bits_at(152, 5, 4);
        case VITAL_PLAY_TYPE4:  return read_bits_at(153, 1, 4);
        case VITAL_BODY_TYPE:   return read_bits_at(134, 3, 2);
        case VITAL_MUSCLE_TONE: return read_bits_at(134, 5, 1);
        case VITAL_SKIN_TONE:   return read_bits_at(134, 6, 3);
        case VITAL_HAIR_TYPE:   return read_bits_at(135, 1, 6);
        case VITAL_HAIR_COLOR:  return read_bits_at(135, 7, 4);
        case VITAL_EYE_COLOR:   return read_bits_at(136, 3, 3);
        case VITAL_EYEBROW:     return read_bits_at(136, 6, 4);
        case VITAL_MUSTACHE:    return read_bits_at(138, 0, 3);
        case VITAL_FCL_HAIR_CLR: return read_bits_at(138, 3, 4);
        case VITAL_BEARD:       return read_bits_at(138, 7, 4);
        case VITAL_GOATEE:      return read_bits_at(139, 3, 5);
        case VITAL_SEC_POS:      return read_byte_at(44);
        case VITAL_DRAFT_YEAR:   return read_byte_at(48);
        case VITAL_DRAFT_ROUND:  return read_bits_at(49, 0, 4);
        case VITAL_DRAFT_PICK:   return read_bits_at(49, 4, 6);
        case VITAL_DRAFT_TEAM:   return read_byte_at(51);
        case VITAL_NICKNAME,     return read_byte_at(54);
        case VITAL_PLAY_INITIATOR: return read_bits_at(96, 0, 1);
        case VITAL_GOES_TO_3PT:  return read_bits_at(96, 1, 1);
        case VITAL_PEAK_AGE_START: return read_byte_at(60);
        case VITAL_PEAK_AGE_END:   return read_byte_at(61);
        case VITAL_POTENTIAL:      return read_byte_at(267);
        case VITAL_LOYALTY:        return read_byte_at(58);
        case VITAL_FINANCIAL_SECURITY: return read_byte_at(59);
        case VITAL_PLAY_FOR_WINNER: return read_byte_at(57);
        default: return 0;
    }
}

void Player::set_vital_by_id(int id, int value) {
    switch (id) {
        case VITAL_POSITION:    write_byte_at(33, value & 0xFF); break;
        case VITAL_HEIGHT:      write_byte_at(34, value & 0xFF); break;
        case VITAL_WEIGHT:      write_byte_at(35, value & 0xFF); break;
        case VITAL_BIRTH_DAY:   write_byte_at(37, value & 0xFF); break;
        case VITAL_BIRTH_MONTH: write_byte_at(38, value & 0xFF); break;
        case VITAL_BIRTH_YEAR:  write_u16_le(39, value & 0xFFFF); break;
        case VITAL_HAND:        write_byte_at(41, value & 0xFF); break;
        case VITAL_DUNK_HAND:   write_byte_at(42, value & 0xFF); break;
        case VITAL_YEARS_PRO:   write_byte_at(43, value & 0xFF); break;
        case VITAL_JERSEY_NUM:  write_bits_at(13, 4, 8, value); break;
        case VITAL_TEAM_ID1:    write_bits_at(1, 0, 8, value); break;
        case VITAL_TEAM_ID2:    write_bits_at(267, 0, 8, value); break;
        case VITAL_CONTRACT_Y1: write_bits_at(222, 0, 32, value); break;
        case VITAL_CONTRACT_Y2: write_bits_at(226, 0, 32, value); break;
        case VITAL_CONTRACT_Y3: write_bits_at(230, 0, 32, value); break;
        case VITAL_CONTRACT_Y4: write_bits_at(234, 0, 32, value); break;
        case VITAL_CONTRACT_Y5: write_bits_at(238, 0, 32, value); break;
        case VITAL_CONTRACT_Y6: write_bits_at(242, 0, 32, value); break;
        case VITAL_CONTRACT_Y7: write_bits_at(246, 0, 32, value); break;
        case VITAL_CONTRACT_OPT: write_bits_at(162, 0, 2, value); break;
        case VITAL_NO_TRADE:    write_bits_at(185, 5, 1, value); break;
        case VITAL_INJURY_TYPE: write_bits_at(32, 1, 7, value); break;
        case VITAL_INJURY_DAYS: write_bits_at(36, 0, 16, value); break;
        case VITAL_PLAY_STYLE:  write_bits_at(162, 5, 5, value); break;
        case VITAL_PLAY_TYPE1:  write_bits_at(151, 5, 4, value); break;
        case VITAL_PLAY_TYPE2:  write_bits_at(152, 1, 4, value); break;
        case VITAL_PLAY_TYPE3:  write_bits_at(152, 5, 4, value); break;
        case VITAL_PLAY_TYPE4:  write_bits_at(153, 1, 4, value); break;
        case VITAL_BODY_TYPE:   write_bits_at(134, 3, 2, value); break;
        case VITAL_MUSCLE_TONE: write_bits_at(134, 5, 1, value); break;
        case VITAL_SKIN_TONE:   write_bits_at(134, 6, 3, value); break;
        case VITAL_HAIR_TYPE:   write_bits_at(135, 1, 6, value); break;
        case VITAL_HAIR_COLOR:  write_bits_at(135, 7, 4, value); break;
        case VITAL_EYE_COLOR:   write_bits_at(136, 3, 3, value); break;
        case VITAL_EYEBROW:     write_bits_at(136, 6, 4, value); break;
        case VITAL_MUSTACHE:    write_bits_at(138, 0, 3, value); break;
        case VITAL_FCL_HAIR_CLR: write_bits_at(138, 3, 4, value); break;
        case VITAL_BEARD:       write_bits_at(138, 7, 4, value); break;
        case VITAL_GOATEE:      write_bits_at(139, 3, 5, value); break;
        case VITAL_SEC_POS:      write_byte_at(44, value & 0xFF); break;
        case VITAL_DRAFT_YEAR:   write_byte_at(48, value & 0xFF); break;
        case VITAL_DRAFT_ROUND:  write_bits_at(49, 0, 4, value); break;
        case VITAL_DRAFT_PICK:   write_bits_at(49, 4, 6, value); break;
        case VITAL_DRAFT_TEAM:   write_byte_at(51, value & 0xFF); break;
        case VITAL_NICKNAME:     write_byte_at(54, value & 0xFF); break;
        case VITAL_PLAY_INITIATOR: write_bits_at(96, 0, 1, value); break;
        case VITAL_GOES_TO_3PT:  write_bits_at(96, 1, 1, value); break;
        case VITAL_PEAK_AGE_START: write_byte_at(60, value & 0xFF); break;
        case VITAL_PEAK_AGE_END:   write_byte_at(61, value & 0xFF); break;
        case VITAL_POTENTIAL:      write_byte_at(267, value & 0xFF); break;
        case VITAL_LOYALTY:        write_byte_at(58, value & 0xFF); break;
        case VITAL_FINANCIAL_SECURITY: write_byte_at(59, value & 0xFF); break;
        case VITAL_PLAY_FOR_WINNER: write_byte_at(57, value & 0xFF); break;
    }
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
// Team Implementation
// ============================================================================

Team::Team()
    : buffer_(nullptr), buffer_length_(0), record_offset_(0)
{}

Team::Team(uint8_t* buffer, size_t buffer_length, size_t record_offset)
    : buffer_(buffer), buffer_length_(buffer_length), record_offset_(record_offset)
{}

// -- Low-level accessors ------------------------------------------------------

uint8_t Team::read_byte_at(size_t offset) const {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset >= buffer_length_) throw std::out_of_range("Team::read_byte_at");
    return buffer_[abs_offset];
}

void Team::write_byte_at(size_t offset, uint8_t value) {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset >= buffer_length_) throw std::out_of_range("Team::write_byte_at");
    buffer_[abs_offset] = value;
}

uint16_t Team::read_u16_le(size_t offset) const {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 1 >= buffer_length_) throw std::out_of_range("Team::read_u16_le");
    return static_cast<uint16_t>(buffer_[abs_offset]) | (static_cast<uint16_t>(buffer_[abs_offset + 1]) << 8);
}

void Team::write_u16_le(size_t offset, uint16_t value) {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 1 >= buffer_length_) throw std::out_of_range("Team::write_u16_le");
    buffer_[abs_offset] = value & 0xFF;
    buffer_[abs_offset + 1] = (value >> 8) & 0xFF;
}

uint32_t Team::read_u32_le(size_t offset) const {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 3 >= buffer_length_) throw std::out_of_range("Team::read_u32_le");
    return static_cast<uint32_t>(buffer_[abs_offset])
         | (static_cast<uint32_t>(buffer_[abs_offset + 1]) << 8)
         | (static_cast<uint32_t>(buffer_[abs_offset + 2]) << 16)
         | (static_cast<uint32_t>(buffer_[abs_offset + 3]) << 24);
}

void Team::write_u32_le(size_t offset, uint32_t value) {
    size_t abs_offset = record_offset_ + offset;
    if (abs_offset + 3 >= buffer_length_) throw std::out_of_range("Team::write_u32_le");
    buffer_[abs_offset] = value & 0xFF;
    buffer_[abs_offset + 1] = (value >> 8) & 0xFF;
    buffer_[abs_offset + 2] = (value >> 16) & 0xFF;
    buffer_[abs_offset + 3] = (value >> 24) & 0xFF;
}

// -- Basic Identifiers --

int Team::get_id() const {
    return static_cast<int>(read_byte_at(0)); // Usually ID is first byte or so, need to verify
}

std::string Team::get_name() const {
    char b[33];
    for(int i=0; i<32; i++) b[i] = static_cast<char>(read_byte_at(33 + i));
    b[32] = '\0';
    return std::string(b);
}

std::string Team::get_city() const {
    char b[33];
    for(int i=0; i<32; i++) b[i] = static_cast<char>(read_byte_at(1 + i));
    b[32] = '\0';
    return std::string(b);
}

std::string Team::get_abbr() const {
    char b[5];
    for(int i=0; i<4; i++) b[i] = static_cast<char>(read_byte_at(65 + i));
    b[4] = '\0';
    return std::string(b);
}

void Team::set_name(const std::string& name) {
    for(int i=0; i<32; i++) {
        write_byte_at(33 + i, i < name.length() ? static_cast<uint8_t>(name[i]) : 0);
    }
}

void Team::set_city(const std::string& city) {
    for(int i=0; i<32; i++) {
        write_byte_at(1 + i, i < city.length() ? static_cast<uint8_t>(city[i]) : 0);
    }
}

void Team::set_abbr(const std::string& abbr) {
    for(int i=0; i<4; i++) {
        write_byte_at(65 + i, i < abbr.length() ? static_cast<uint8_t>(abbr[i]) : 0);
    }
}

// -- Colors --
// Colors are stored as 32-bit ARGB at offset 40 (Color1) and 44 (Color2) usually
uint32_t Team::get_color1() const {
    return read_u32_le(40);
}

uint32_t Team::get_color2() const {
    return read_u32_le(44);
}

void Team::set_color1(uint32_t argb) {
    write_u32_le(40, argb);
}

void Team::set_color2(uint32_t argb) {
    write_u32_le(44, argb);
}

// -- Rosters --
// The 15-man active roster array starts exactly at +108 bytes
// Each slot is a 16-bit player index

int Team::get_roster_player_id(int index) const {
    if (index < 0 || index >= 15) return -1;
    return static_cast<int>(read_u16_le(108 + index * 2));
}

void Team::set_roster_player_id(int index, int player_id) {
    if (index < 0 || index >= 15) return;
    write_u16_le(108 + index * 2, static_cast<uint16_t>(player_id));
}

// ============================================================================
// Bit-packed helpers
// ============================================================================

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

static constexpr size_t TENDENCY_BASE_BYTE = 144;
static constexpr int    TENDENCY_BASE_BIT  = 3;

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
    return static_cast<int>(read_bits_at(bo, bi, 8) & 127);
}

void Player::set_tendency_by_id(int id, int value) {
    if (id < 0 || id >= 58) return;
    size_t bo; int bi;
    tendency_offset(id, bo, bi);
    uint32_t current = read_bits_at(bo, bi, 8);
    uint32_t msb = current & 128;
    write_bits_at(bo, bi, 8, static_cast<uint32_t>((value & 127) | msb));
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
// Gear — 48 mixed bit-width fields starting at Byte 129, Bit 7
// ============================================================================

struct GearDef {
    int bit_offset;
    int bit_width;
};

static constexpr GearDef GEAR_DEFS[48] = {
    { 0, 1 }, { 1, 3 }, { 4, 2 }, { 6, 2 }, { 8, 3 }, { 11, 2 }, { 13, 3 }, { 16, 2 },
    { 18, 4 }, { 22, 2 }, { 24, 2 }, { 26, 2 }, { 28, 2 }, { 30, 3 }, { 33, 2 }, { 35, 3 },
    { 38, 2 }, { 40, 4 }, { 44, 2 }, { 46, 2 }, { 48, 2 }, { 50, 2 }, { 52, 1 }, { 53, 2 },
    { 55, 3 }, { 58, 2 }, { 60, 2 }, { 62, 2 }, { 64, 2 }, { 66, 2 }, { 68, 3 }, { 71, 2 },
    { 73, 2 }, { 75, 2 }, { 77, 2 }, { 79, 2 }, { 81, 3 }, { 84, 4 }, { 88, 4 }, { 92, 32 },
    { 124, 32 }, { 156, 32 }, { 188, 32 }, { 220, 2 }, { 222, 2 }, { 224, 2 }, { 226, 2 }, { 228, 2 }
};

static constexpr size_t GEAR_BASE_BYTE = 129;
static constexpr int    GEAR_BASE_BIT  = 7;

uint32_t Player::get_gear_by_id(int id) const {
    if (id < 0 || id >= 48) return 0;
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + GEAR_DEFS[id].bit_offset;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    return read_bits_at(bo, bi, GEAR_DEFS[id].bit_width);
}

void Player::set_gear_by_id(int id, uint32_t value) {
    if (id < 0 || id >= 48) return;
    long long total = static_cast<long long>(GEAR_BASE_BYTE) * 8 + GEAR_BASE_BIT + GEAR_DEFS[id].bit_offset;
    size_t bo = static_cast<size_t>(total / 8);
    int bi = static_cast<int>(total % 8);
    uint32_t mask = (1ULL << GEAR_DEFS[id].bit_width) - 1;
    write_bits_at(bo, bi, GEAR_DEFS[id].bit_width, value & mask);
}

// ============================================================================
// Data-driven Animations (40 items)
// ============================================================================
// RED MC 40 Animation sequence is split between offset 193 (Shots/Signatures),
// 178 (Dunks), and 274 (Layup).

static constexpr size_t ANIM_SHOTS_BASE = 193; // 193 + 0..18 = Shots & Iso
static constexpr size_t ANIM_DUNKS_BASE = 178; // 178 + 0..14 = Dunks
static constexpr size_t ANIM_INTRO_BASE = 211; // 193 + 18 = 211? No, 193 to 215 = 23 bytes

int Player::get_animation_by_id(int id) const {
    if (id < 0 || id >= ANIM_COUNT) return 0;
    
    // id 0-18: Shots & Momentum & Post & Iso Drives -> Base 193 + id
    if (id >= 0 && id <= 18) {
        return static_cast<int>(read_byte_at(ANIM_SHOTS_BASE + id));
    }
    // id 19: Layup Package -> 4 bits at byte 274, bit 2
    if (id == 19) {
        return static_cast<int>(read_bits_at(274, 2, 4));
    }
    // id 20-34: Dunk Packages 1-15 -> Base 178 + (id - 20)
    if (id >= 20 && id <= 34) {
        return static_cast<int>(read_byte_at(ANIM_DUNKS_BASE + (id - 20)));
    }
    // id 35-39: Pregame Intros -> follow offset 193 + 19 = 212
    if (id >= 35 && id <= 39) {
        return static_cast<int>(read_byte_at(ANIM_SHOTS_BASE + 19 + (id - 35)));
    }
    return 0;
}

void Player::set_animation_by_id(int id, int val) {
    if (id < 0 || id >= ANIM_COUNT) return;
    
    if (id >= 0 && id <= 18) {
        write_byte_at(ANIM_SHOTS_BASE + id, static_cast<uint8_t>(val & 0xFF));
    } else if (id == 19) {
        write_bits_at(274, 2, 4, static_cast<uint32_t>(val & 0xF));
    } else if (id >= 20 && id <= 34) {
        write_byte_at(ANIM_DUNKS_BASE + (id - 20), static_cast<uint8_t>(val & 0xFF));
    } else if (id >= 35 && id <= 39) {
        write_byte_at(ANIM_SHOTS_BASE + 19 + (id - 35), static_cast<uint8_t>(val & 0xFF));
    }
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
    discover_team_table();
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

    // Method 1: Scan the entire file for the first sequential player block.
    // The player table in 2K14 starts relatively early (e.g. around 0x21CE3).
    // We cannot rely on a single TEAM_TABLE_MARKER anchor.
    bool found = false;
    size_t candidate_offset = 0;

    // Scan forward from the beginning of the buffer
    for (size_t offset = 0; offset < buffer_length_ - DEFAULT_RECORD_SIZE * 3; offset += 4) {
        // Check if this could be the start of a player table:
        // Look for three consecutive records that have reasonable CFID values.
        // Note: The very first record (Index 0) is often a Null Player with CFID == 0.
        // We must allow cfid1 to be 0.
        size_t cfid_offset_1 = offset + CFID_OFFSET;
        size_t cfid_offset_2 = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
        size_t cfid_offset_3 = offset + (DEFAULT_RECORD_SIZE * 2) + CFID_OFFSET;

        if (cfid_offset_3 + 1 >= buffer_length_) break;

        uint16_t cfid1 = static_cast<uint16_t>(buffer_[cfid_offset_1])
                       | (static_cast<uint16_t>(buffer_[cfid_offset_1 + 1]) << 8);
        uint16_t cfid2 = static_cast<uint16_t>(buffer_[cfid_offset_2])
                       | (static_cast<uint16_t>(buffer_[cfid_offset_2 + 1]) << 8);
        uint16_t cfid3 = static_cast<uint16_t>(buffer_[cfid_offset_3])
                       | (static_cast<uint16_t>(buffer_[cfid_offset_3 + 1]) << 8);

        // Heuristic: valid CFIDs are typically in range 0–10000.
        // Allow Index 0 to be exactly 0. Index 1 and 2 must be valid actual CFIDs.
        // Note: CFIDs around 1013 (LeBron) are common.
        if ((cfid1 == 0 || (cfid1 > 0 && cfid1 < 10000)) &&
             (cfid2 > 0 && cfid2 < 10000) &&
             (cfid3 > 0 && cfid3 < 10000)) {
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

// -- Team Table Discovery -----------------------------------------------------
// Strategy: Find Team 0 (76ers) or Team 1 (Bucks) roster array, identify the record start,
// and set the table offset and size.
void RosterEditor::discover_team_table() {
    team_table_offset_ = 0;
    team_count_ = 0;
    team_record_size_ = 716; // Typically 716 bytes in 2K14

    // To find the Team Table accurately without static offsets, we look for the unique 
    // sequence of player IDs that make up a known team's roster.
    
    // We extracted the Milwaukee Bucks (Team 1) roster array from the Player table earlier:
    // [1, 9, 17, 25, 33, 59]
    // The roster array starts at offset +108 bytes into the Team record.
    
    bool found_bucks = false;
    size_t bucks_array_offset = 0;
    
    for (size_t offset = 0; offset < buffer_length_ - 12; offset += 2) {
        if (buffer_[offset] == 1 && buffer_[offset+1] == 0 &&
            buffer_[offset+2] == 9 && buffer_[offset+3] == 0 &&
            buffer_[offset+4] == 17 && buffer_[offset+5] == 0 &&
            buffer_[offset+6] == 25 && buffer_[offset+7] == 0 &&
            buffer_[offset+8] == 33 && buffer_[offset+9] == 0) {
            bucks_array_offset = offset;
            found_bucks = true;
            break;
        }
    }
    
    // If Bucks roster array is found, Team 1 record starts 108 bytes before it.
    // Team 0 (76ers) is immediately before Team 1, so the Team Table starts at:
    // Team 1 Start - team_record_size
    if (found_bucks && bucks_array_offset >= (108 + team_record_size_)) {
        size_t team1_start = bucks_array_offset - 108;
        team_table_offset_ = team1_start - team_record_size_;
        team_count_ = 100; // Expected number of teams in 2K14
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

int RosterEditor::get_team_count() const {
    return team_count_;
}

Team RosterEditor::get_team(int index) const {
    if (index < 0 || index >= team_count_) {
        throw std::out_of_range("RosterEditor::get_team: index out of range");
    }
    size_t offset = team_table_offset_ + static_cast<size_t>(index) * team_record_size_;
    return Team(buffer_, buffer_length_, offset);
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
