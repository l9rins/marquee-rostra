// ============================================================================
// bindings.cpp — Emscripten Embind glue for Player & RosterEditor
// ============================================================================
// Embind is the modern Emscripten binding mechanism. It registers C++ classes
// and methods so they're accessible as JavaScript objects.
//
// Build with: -lembind --bind
// ============================================================================

#include "RosterEditor.hpp"
#include <emscripten/bind.h>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(roster_editor_module) {

    class_<Player>("Player")
        .constructor<>()
        .function("get_cfid",               &Player::get_cfid)
        .function("set_cfid",               &Player::set_cfid)
        .function("get_three_point_rating",  &Player::get_three_point_rating)
        .function("set_three_point_rating",  &Player::set_three_point_rating)
        .function("get_mid_range_rating",    &Player::get_mid_range_rating)
        .function("set_mid_range_rating",    &Player::set_mid_range_rating)
        .function("get_dunk_rating",         &Player::get_dunk_rating)
        .function("set_dunk_rating",         &Player::set_dunk_rating)
        .function("get_speed_rating",        &Player::get_speed_rating)
        .function("set_speed_rating",        &Player::set_speed_rating)
        .function("get_overall_rating",      &Player::get_overall_rating)
        .function("set_overall_rating",      &Player::set_overall_rating)
        .function("get_first_name",          &Player::get_first_name)
        .function("get_last_name",           &Player::get_last_name)
        .function("get_position",            &Player::get_position)
        ;

    class_<RosterEditor>("RosterEditor")
        .constructor<>()
        .function("init",                          &RosterEditor::init)
        .function("get_player_count",              &RosterEditor::get_player_count)
        .function("get_player",                    &RosterEditor::get_player)
        .function("save_and_recalculate_checksum", &RosterEditor::save_and_recalculate_checksum)
        .function("get_buffer_ptr",                &RosterEditor::get_buffer_ptr)
        .function("get_buffer_length",             &RosterEditor::get_buffer_length)
        ;
}
