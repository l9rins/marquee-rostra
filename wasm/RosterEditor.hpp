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
class Player {
public:
    Player();
    Player(uint8_t* buffer, size_t buffer_length, size_t record_offset);

    // -- Cyberface ID (16-bit at +28 bytes from record start) ----------------
    int  get_cfid() const;
    void set_cfid(int new_cfid);

    // -- Ratings (raw byte → display: (raw/3)+25 ; display → raw: (d-25)*3) --
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

    // -- Record context ------------------------------------------------------
    size_t get_record_offset() const { return record_offset_; }

private:
    uint8_t* buffer_;
    size_t   buffer_length_;
    size_t   record_offset_;   // Absolute byte offset of this player's record

    // Helpers
    uint8_t  read_byte_at(size_t offset) const;
    void     write_byte_at(size_t offset, uint8_t value);
    uint16_t read_u16_le(size_t offset) const;
    void     write_u16_le(size_t offset, uint16_t value);

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
