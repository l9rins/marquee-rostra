// ============================================================================
// BitStream.cpp — Non-byte-aligned binary reader/writer implementation
// ============================================================================
// Reads and writes arbitrary bit-width fields across byte boundaries.
// Bit numbering: bit 0 = MSB of current byte, bit 7 = LSB.
// ============================================================================

#include "BitStream.hpp"
#include <stdexcept>
#include <algorithm>

// ---- Construction -----------------------------------------------------------

BitStream::BitStream(uint8_t* buffer, size_t length)
    : buffer_(buffer), length_(length), byte_offset_(0), bit_offset_(0)
{
    if (!buffer && length > 0) {
        throw std::invalid_argument("BitStream: null buffer with non-zero length");
    }
}

// ---- Cursor positioning -----------------------------------------------------

void BitStream::jump_to(size_t byte_offset, int bit_offset) {
    if (byte_offset > length_) {
        throw std::out_of_range("BitStream::jump_to: byte offset beyond buffer");
    }
    if (bit_offset < 0 || bit_offset > 7) {
        throw std::out_of_range("BitStream::jump_to: bit offset must be 0-7");
    }
    byte_offset_ = byte_offset;
    bit_offset_  = bit_offset;
}

void BitStream::move(int bytes, int bits) {
    // Combine current position with delta
    long long total_bits = static_cast<long long>(byte_offset_) * 8 + bit_offset_
                         + static_cast<long long>(bytes) * 8 + bits;

    if (total_bits < 0) {
        throw std::out_of_range("BitStream::move: resulting position is negative");
    }

    byte_offset_ = static_cast<size_t>(total_bits / 8);
    bit_offset_  = static_cast<int>(total_bits % 8);

    if (byte_offset_ > length_) {
        throw std::out_of_range("BitStream::move: resulting position beyond buffer");
    }
}

// ---- Reading ----------------------------------------------------------------

uint32_t BitStream::read_bits(int count) {
    if (count <= 0 || count > 32) {
        throw std::invalid_argument("BitStream::read_bits: count must be 1-32");
    }

    uint32_t result = 0;

    for (int i = 0; i < count; ++i) {
        if (byte_offset_ >= length_) {
            throw std::out_of_range("BitStream::read_bits: read past end of buffer");
        }

        // Extract single bit (MSB-first within each byte)
        int bit_index = 7 - bit_offset_;  // bit 0 of stream = MSB of byte
        uint32_t bit = (buffer_[byte_offset_] >> bit_index) & 1u;

        // Place it into result (MSB-first: first bit read = highest bit)
        result = (result << 1) | bit;

        // Advance cursor
        bit_offset_++;
        if (bit_offset_ >= 8) {
            bit_offset_ = 0;
            byte_offset_++;
        }
    }

    return result;
}

uint8_t BitStream::read_byte() {
    return static_cast<uint8_t>(read_bits(8));
}

void BitStream::read_bytes(uint8_t* out, int count) {
    for (int i = 0; i < count; ++i) {
        out[i] = read_byte();
    }
}

// ---- Writing ----------------------------------------------------------------

void BitStream::write_bits(uint32_t value, int count) {
    if (count <= 0 || count > 32) {
        throw std::invalid_argument("BitStream::write_bits: count must be 1-32");
    }

    for (int i = count - 1; i >= 0; --i) {
        if (byte_offset_ >= length_) {
            throw std::out_of_range("BitStream::write_bits: write past end of buffer");
        }

        // Extract the i-th bit from value (MSB-first)
        uint32_t bit = (value >> i) & 1u;

        // Set or clear the corresponding bit in the buffer byte
        int bit_index = 7 - bit_offset_;
        if (bit) {
            buffer_[byte_offset_] |= (1u << bit_index);
        } else {
            buffer_[byte_offset_] &= ~(1u << bit_index);
        }

        // Advance cursor
        bit_offset_++;
        if (bit_offset_ >= 8) {
            bit_offset_ = 0;
            byte_offset_++;
        }
    }
}

void BitStream::write_byte(uint8_t value) {
    write_bits(value, 8);
}

void BitStream::write_bytes(const uint8_t* data, int count) {
    for (int i = 0; i < count; ++i) {
        write_byte(data[i]);
    }
}
