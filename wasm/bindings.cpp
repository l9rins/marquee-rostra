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
        // -- Data-driven (covers ALL ratings/tendencies) --
        .function("get_rating_by_id",        &Player::get_rating_by_id)
        .function("set_rating_by_id",        &Player::set_rating_by_id)
        .function("get_tendency_by_id",      &Player::get_tendency_by_id)
        .function("set_tendency_by_id",      &Player::set_tendency_by_id)
        .function("get_hot_zone",            &Player::get_hot_zone)
        .function("set_hot_zone",            &Player::set_hot_zone)
        .function("get_sig_skill",           &Player::get_sig_skill)
        .function("set_sig_skill",           &Player::set_sig_skill)
        // -- Tendencies (bit-packed) --
        .function("get_tendency_stepback_shot_3pt",  &Player::get_tendency_stepback_shot_3pt)
        .function("set_tendency_stepback_shot_3pt",  &Player::set_tendency_stepback_shot_3pt)
        .function("get_tendency_driving_layup",      &Player::get_tendency_driving_layup)
        .function("set_tendency_driving_layup",      &Player::set_tendency_driving_layup)
        .function("get_tendency_standing_dunk",      &Player::get_tendency_standing_dunk)
        .function("set_tendency_standing_dunk",      &Player::set_tendency_standing_dunk)
        .function("get_tendency_driving_dunk",       &Player::get_tendency_driving_dunk)
        .function("set_tendency_driving_dunk",       &Player::set_tendency_driving_dunk)
        .function("get_tendency_post_hook",          &Player::get_tendency_post_hook)
        .function("set_tendency_post_hook",          &Player::set_tendency_post_hook)
        // -- Gear (data-driven) --
        .function("get_gear_by_id",           &Player::get_gear_by_id)
        .function("set_gear_by_id",           &Player::set_gear_by_id)
        // -- Signatures (byte-aligned) --
        .function("get_animation_by_id",      &Player::get_animation_by_id)
        .function("set_animation_by_id",      &Player::set_animation_by_id)
        // -- Vitals (data-driven) --
        .function("get_vital_by_id",          &Player::get_vital_by_id)
        .function("set_vital_by_id",          &Player::set_vital_by_id)
        .function("set_vital_by_id",          &Player::set_vital_by_id)
        ;

    class_<Team>("Team")
        .constructor<>()
        .function("get_id",                   &Team::get_id)
        .function("get_name",                 &Team::get_name)
        .function("get_city",                 &Team::get_city)
        .function("get_abbr",                 &Team::get_abbr)
        .function("set_name",                 &Team::set_name)
        .function("set_city",                 &Team::set_city)
        .function("set_abbr",                 &Team::set_abbr)
        .function("get_color1",               &Team::get_color1)
        .function("get_color2",               &Team::get_color2)
        .function("set_color1",               &Team::set_color1)
        .function("set_color2",               &Team::set_color2)
        .function("get_roster_player_id",     &Team::get_roster_player_id)
        .function("set_roster_player_id",     &Team::set_roster_player_id)
        ;

    class_<RosterEditor>("RosterEditor")
        .constructor<>()
        .function("init",                          &RosterEditor::init)
        .function("get_player_count",              &RosterEditor::get_player_count)
        .function("get_player",                    &RosterEditor::get_player)
        .function("get_team_count",                &RosterEditor::get_team_count)
        .function("get_team",                      &RosterEditor::get_team)
        .function("save_and_recalculate_checksum", &RosterEditor::save_and_recalculate_checksum)
        .function("get_buffer_ptr",                &RosterEditor::get_buffer_ptr)
        .function("get_buffer_length",             &RosterEditor::get_buffer_length)
        ;
}
