# ============================================================================
# Makefile — Emscripten build for the NBA 2K14 Roster Editor Wasm module
# ============================================================================
# Prerequisites: Install emsdk and activate it before running:
#   emsdk install latest && emsdk activate latest
#   source emsdk_env.sh  (or emsdk_env.bat on Windows)
#
# Build:   make
# Clean:   make clean
# ============================================================================

CXX      = em++
CXXFLAGS = -std=c++17 -O2 -Wall -Wextra

# Emscripten linker flags (as specified in the architecture requirements)
LDFLAGS  = \
	--bind \
	-s INITIAL_MEMORY=128MB \
	-s MAXIMUM_MEMORY=512MB \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME="'RosterEditorModule'" \
	-s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','HEAPU8']" \
	-s EXPORTED_FUNCTIONS="['_malloc','_free']" \
	-s USE_ZLIB=1 \
	-s ENVIRONMENT='web'

# Source files
SOURCES = BitStream.cpp RosterEditor.cpp bindings.cpp

# Output
OUTPUT_DIR = ../public
OUTPUT_JS  = $(OUTPUT_DIR)/roster_editor.js
OUTPUT_WASM = $(OUTPUT_DIR)/roster_editor.wasm

.PHONY: all clean

all: $(OUTPUT_JS)

$(OUTPUT_JS): $(SOURCES) BitStream.hpp RosterEditor.hpp
	@mkdir -p $(OUTPUT_DIR)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(OUTPUT_JS) $(LDFLAGS)
	@echo "✅ Build complete: $(OUTPUT_JS) + $(OUTPUT_WASM)"

clean:
	rm -f $(OUTPUT_JS) $(OUTPUT_WASM)
	@echo "🧹 Cleaned build artifacts"
