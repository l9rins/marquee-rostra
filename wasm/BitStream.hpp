#pragma once
// ============================================================================
// BitStream.hpp — Non-byte-aligned binary reader/writer for NBA 2K14 .ROS files
// ============================================================================
//
// The 2K14 .ROS format stores many fields at arbitrary bit offsets (not always
// on byte boundaries). This class provides read_bits / write_bits / jump_to /
// move operations over a raw uint8_t* buffer with precise bit-level cursor
// tracking.
//
// Design inspired by leftos/nba-2k13-roster-editor NonByteAlignedBinaryRW.
// ============================================================================

#include <cstdint>
#include <cstddef>

class BitStream {
public:
    // ---- Construction -------------------------------------------------------
    // Does NOT own the buffer. Caller must keep it alive.
    BitStream(uint8_t* buffer, size_t length);

    // ---- Cursor positioning -------------------------------------------------
    // Absolute jump to a specific byte + bit offset.
    void jump_to(size_t byte_offset, int bit_offset = 0);

    // Relative move (can be negative for bytes).
    void move(int bytes, int bits);

    // Query current position.
    size_t get_byte_offset() const { return byte_offset_; }
    int    get_bit_offset()  const { return bit_offset_;  }
    size_t get_length()      const { return length_;      }

    // ---- Reading ------------------------------------------------------------
    // Read up to 32 bits from the current position. Advances cursor.
    uint32_t read_bits(int count);

    // Read a single aligned byte (fast path). Advances cursor by 8 bits.
    uint8_t read_byte();

    // Read N aligned bytes into a caller-provided buffer.
    void read_bytes(uint8_t* out, int count);

    // ---- Writing ------------------------------------------------------------
    // Write up to 32 bits at the current position. Advances cursor.
    void write_bits(uint32_t value, int count);

    // Write a single aligned byte. Advances cursor by 8 bits.
    void write_byte(uint8_t value);

    // Write N aligned bytes from a caller-provided buffer.
    void write_bytes(const uint8_t* data, int count);

private:
    uint8_t* buffer_;
    size_t   length_;          // Total buffer size in bytes
    size_t   byte_offset_;     // Current byte position
    int      bit_offset_;      // Current bit position within byte (0–7, MSB=0)
};
