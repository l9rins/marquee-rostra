@echo off
cd /d "c:\Users\Mark Lorenz\Desktop\emsdk"
call emsdk_env.bat
cd /d "c:\Users\Mark Lorenz\Desktop\rostra\wasm"
emcc --bind -O2 -std=c++17 ^
    -s INITIAL_MEMORY=128MB ^
    -s MAXIMUM_MEMORY=512MB ^
    -s ALLOW_MEMORY_GROWTH=1 ^
    -s MODULARIZE=1 ^
    -s EXPORT_NAME="'RosterEditorModule'" ^
    -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','HEAPU8']" ^
    -s EXPORTED_FUNCTIONS="['_malloc','_free']" ^
    -s USE_ZLIB=1 ^
    -s ENVIRONMENT="web" ^
    BitStream.cpp RosterEditor.cpp bindings.cpp ^
    -o ../public/roster_editor.js
