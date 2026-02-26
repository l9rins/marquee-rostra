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

// Ratings offsets (relative to player record start)
// These are based on research from the 2K modding community
static constexpr size_t RATING_THREE_PT   = 44;    // 3-point shooting
static constexpr size_t RATING_MID_RANGE  = 45;    // Mid-range shooting
static constexpr size_t RATING_DUNK       = 46;    // Dunk ability
static constexpr size_t RATING_SPEED      = 48;    // Speed
static constexpr size_t RATING_OVERALL    = 30;    // Overall rating

// Name table offsets (relative to player record start)
static constexpr size_t FIRST_NAME_OFFSET = 52;    // Offset to first name pointer
static constexpr size_t LAST_NAME_OFFSET  = 56;    // Offset to last name pointer

// Position info
static constexpr size_t POSITION_OFFSET   = 60;    // Position byte

// Default player record size (for 2K14 roster format)
static constexpr size_t DEFAULT_RECORD_SIZE = 128;

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

// -- Ratings ------------------------------------------------------------------

int Player::get_three_point_rating() const {
    return raw_to_display(read_byte_at(RATING_THREE_PT));
}

void Player::set_three_point_rating(int rating) {
    write_byte_at(RATING_THREE_PT, display_to_raw(rating));
}

int Player::get_mid_range_rating() const {
    return raw_to_display(read_byte_at(RATING_MID_RANGE));
}

void Player::set_mid_range_rating(int rating) {
    write_byte_at(RATING_MID_RANGE, display_to_raw(rating));
}

int Player::get_dunk_rating() const {
    return raw_to_display(read_byte_at(RATING_DUNK));
}

void Player::set_dunk_rating(int rating) {
    write_byte_at(RATING_DUNK, display_to_raw(rating));
}

int Player::get_speed_rating() const {
    return raw_to_display(read_byte_at(RATING_SPEED));
}

void Player::set_speed_rating(int rating) {
    write_byte_at(RATING_SPEED, display_to_raw(rating));
}

int Player::get_overall_rating() const {
    return raw_to_display(read_byte_at(RATING_OVERALL));
}

void Player::set_overall_rating(int rating) {
    write_byte_at(RATING_OVERALL, display_to_raw(rating));
}

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
