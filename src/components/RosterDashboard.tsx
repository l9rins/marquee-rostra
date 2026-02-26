// ============================================================================
// RosterDashboard.tsx — Main UI for the NBA 2K14 .ROS Roster Editor
// ============================================================================
// Features:
//   1. Zero-copy file upload (drag-and-drop + file picker)
//   2. Pure-JS fallback engine (no Wasm needed for dev/test)
//   3. Editable data grid with inline cell editing
//   4. Search/filter by player name or CFID
//   5. Export with CRC32 checksum recalculation
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ============================================================================
// Pure-JS Fallback Engine (mirrors the C++ logic for dev/test)
// ============================================================================

/** CRC32 lookup table (IEEE 802.3 polynomial, same as zlib) */
function makeCRC32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
}

const CRC32_TABLE = makeCRC32Table();

function crc32(data: Uint8Array, offset: number = 0, length?: number): number {
    let crc = 0xFFFFFFFF;
    const end = offset + (length ?? data.length - offset);
    for (let i = offset; i < end; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function bswap32(value: number): number {
    return (
        ((value >> 24) & 0xFF) |
        ((value >> 8) & 0xFF00) |
        ((value << 8) & 0xFF0000) |
        ((value << 24) & 0xFF000000)
    ) >>> 0;
}

// ---- Player record constants (mirroring RosterEditor.cpp) -------------------
const TEAM_TABLE_MARKER = 0x2850EC;
const CFID_OFFSET = 28;
const RATING_THREE_PT = 44;
const RATING_MID_RANGE = 45;
const RATING_DUNK = 46;
const RATING_SPEED = 48;
const RATING_OVERALL = 30;
const FIRST_NAME_OFFSET = 52;
const LAST_NAME_OFFSET = 56;
const POSITION_OFFSET = 60;
const DEFAULT_RECORD_SIZE = 128;
const MAX_PLAYERS = 1500;

function rawToDisplay(raw: number): number {
    return Math.floor(raw / 3) + 25;
}

function displayToRaw(display: number): number {
    return Math.max(0, Math.min(255, (display - 25) * 3));
}

/** Position index → display string */
const POSITION_NAMES: Record<number, string> = {
    0: 'PG', 1: 'SG', 2: 'SF', 3: 'PF', 4: 'C',
};

// ---- JS Player Data --------------------------------------------------------
interface PlayerData {
    index: number;
    recordOffset: number;
    cfid: number;
    firstName: string;
    lastName: string;
    threePointRating: number;
    midRangeRating: number;
    dunkRating: number;
    speedRating: number;
    overallRating: number;
    position: string;
}

// ---- RosterEngineJS --------------------------------------------------------
class RosterEngineJS {
    private buffer: Uint8Array;
    private playerTableOffset: number = 0;
    private playerCount: number = 0;

    constructor(buffer: ArrayBuffer) {
        this.buffer = new Uint8Array(buffer);
        this.discoverPlayerTable();
    }

    private readU16LE(offset: number): number {
        if (offset + 1 >= this.buffer.length) return 0;
        return this.buffer[offset] | (this.buffer[offset + 1] << 8);
    }

    private writeU16LE(offset: number, value: number): void {
        if (offset + 1 >= this.buffer.length) return;
        this.buffer[offset] = value & 0xFF;
        this.buffer[offset + 1] = (value >> 8) & 0xFF;
    }

    private readU32LE(offset: number): number {
        if (offset + 3 >= this.buffer.length) return 0;
        return (
            this.buffer[offset] |
            (this.buffer[offset + 1] << 8) |
            (this.buffer[offset + 2] << 16) |
            (this.buffer[offset + 3] << 24)
        ) >>> 0;
    }

    private readStringAt(ptr: number, maxLen: number = 64): string {
        if (ptr === 0 || ptr >= this.buffer.length) return '';
        let str = '';
        for (let i = ptr; i < Math.min(ptr + maxLen, this.buffer.length); i++) {
            if (this.buffer[i] === 0) break;
            const ch = this.buffer[i];
            if (ch < 32 || ch > 126) break;
            str += String.fromCharCode(ch);
        }
        return str;
    }

    private readName(absOffset: number): string {
        if (absOffset + 3 >= this.buffer.length) return '';
        const ptr = this.readU32LE(absOffset);
        if (ptr > 0 && ptr < this.buffer.length) {
            const name = this.readStringAt(ptr);
            if (name) return name;
        }
        // Fallback: try inline ASCII
        return this.readStringAt(absOffset, 32) || 'Unknown';
    }

    private discoverPlayerTable(): void {
        if (this.buffer.length < TEAM_TABLE_MARKER + 64) {
            this.playerTableOffset = 0;
            this.playerCount = 0;
            return;
        }

        let found = false;
        for (let offset = TEAM_TABLE_MARKER; offset < this.buffer.length - DEFAULT_RECORD_SIZE * 2; offset += 4) {
            const cfidOff1 = offset + CFID_OFFSET;
            const cfidOff2 = offset + DEFAULT_RECORD_SIZE + CFID_OFFSET;
            if (cfidOff2 + 1 >= this.buffer.length) break;

            const cfid1 = this.readU16LE(cfidOff1);
            const cfid2 = this.readU16LE(cfidOff2);

            if (cfid1 > 0 && cfid1 < 10000 && cfid2 > 0 && cfid2 < 10000) {
                this.playerTableOffset = offset;
                found = true;
                break;
            }
        }

        if (!found) {
            this.playerTableOffset = 0;
            this.playerCount = 0;
            return;
        }

        // Count players
        this.playerCount = 0;
        for (
            let offset = this.playerTableOffset;
            offset + DEFAULT_RECORD_SIZE <= this.buffer.length && this.playerCount < MAX_PLAYERS;
            offset += DEFAULT_RECORD_SIZE
        ) {
            const cfid = this.readU16LE(offset + CFID_OFFSET);
            if (cfid === 0 && this.playerCount > 10) {
                const nextCfid = this.readU16LE(offset + DEFAULT_RECORD_SIZE + CFID_OFFSET);
                if (nextCfid === 0) break;
            }
            this.playerCount++;
        }
    }

    getPlayerCount(): number {
        return this.playerCount;
    }

    getPlayer(index: number): PlayerData {
        const recordOffset = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;

        const cfid = this.readU16LE(recordOffset + CFID_OFFSET);
        const firstName = this.readName(recordOffset + FIRST_NAME_OFFSET);
        const lastName = this.readName(recordOffset + LAST_NAME_OFFSET);
        const posRaw = this.buffer[recordOffset + POSITION_OFFSET] ?? 0;

        return {
            index,
            recordOffset,
            cfid,
            firstName: firstName || `Player`,
            lastName: lastName || `#${index}`,
            threePointRating: rawToDisplay(this.buffer[recordOffset + RATING_THREE_PT] ?? 0),
            midRangeRating: rawToDisplay(this.buffer[recordOffset + RATING_MID_RANGE] ?? 0),
            dunkRating: rawToDisplay(this.buffer[recordOffset + RATING_DUNK] ?? 0),
            speedRating: rawToDisplay(this.buffer[recordOffset + RATING_SPEED] ?? 0),
            overallRating: rawToDisplay(this.buffer[recordOffset + RATING_OVERALL] ?? 0),
            position: POSITION_NAMES[posRaw] ?? `${posRaw}`,
        };
    }

    setCFID(index: number, newCfid: number): void {
        const recordOffset = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        this.writeU16LE(recordOffset + CFID_OFFSET, newCfid);
    }

    setRating(index: number, ratingOffset: number, displayValue: number): void {
        const recordOffset = this.playerTableOffset + index * DEFAULT_RECORD_SIZE;
        const absOffset = recordOffset + ratingOffset;
        if (absOffset < this.buffer.length) {
            this.buffer[absOffset] = displayToRaw(displayValue);
        }
    }

    saveAndRecalculateChecksum(): Uint8Array {
        // 1. CRC32 over payload (bytes 4..end)
        const crcValue = crc32(this.buffer, 4, this.buffer.length - 4);
        // 2. Byte-swap
        const swapped = bswap32(crcValue);
        // 3. Write first 4 bytes (LE)
        this.buffer[0] = swapped & 0xFF;
        this.buffer[1] = (swapped >> 8) & 0xFF;
        this.buffer[2] = (swapped >> 16) & 0xFF;
        this.buffer[3] = (swapped >> 24) & 0xFF;
        return this.buffer;
    }

    getBuffer(): Uint8Array {
        return this.buffer;
    }

    getFileSize(): number {
        return this.buffer.length;
    }
}

// ============================================================================
// React Component
// ============================================================================

const ROWS_PER_PAGE = 25;

type EditingCell = {
    playerIndex: number;
    field: 'cfid' | 'threePointRating' | 'midRangeRating' | 'dunkRating' | 'speedRating' | 'overallRating';
};

type ToastState = {
    message: string;
    type: 'success' | 'error';
} | null;

const RATING_FIELD_TO_OFFSET: Record<string, number> = {
    threePointRating: RATING_THREE_PT,
    midRangeRating: RATING_MID_RANGE,
    dunkRating: RATING_DUNK,
    speedRating: RATING_SPEED,
    overallRating: RATING_OVERALL,
};

export default function RosterDashboard() {
    // ---- State ----------------------------------------------------------------
    const [engine, setEngine] = useState<RosterEngineJS | null>(null);
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [fileSize, setFileSize] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState('');
    const [toast, setToast] = useState<ToastState>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // ---- Toast auto-dismiss ---------------------------------------------------
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // ---- Focus edit input when editing ----------------------------------------
    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingCell]);

    // ---- File processing ------------------------------------------------------
    const processFile = useCallback((buffer: ArrayBuffer, name: string) => {
        setIsLoading(true);
        try {
            const eng = new RosterEngineJS(buffer);
            setEngine(eng);
            setFileName(name);
            setFileSize(buffer.byteLength);

            const count = eng.getPlayerCount();
            const playerList: PlayerData[] = [];
            for (let i = 0; i < count; i++) {
                playerList.push(eng.getPlayer(i));
            }
            setPlayers(playerList);
            setCurrentPage(0);
            setSearchQuery('');
            setToast({ message: `Loaded ${count} players from ${name}`, type: 'success' });
        } catch (err) {
            console.error('Failed to parse .ROS file:', err);
            setToast({ message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ---- Drag & Drop handlers -------------------------------------------------
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    processFile(reader.result, file.name);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }, [processFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    processFile(reader.result, file.name);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }, [processFile]);

    // ---- Search & filter ------------------------------------------------------
    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return players;
        const q = searchQuery.toLowerCase();
        return players.filter(
            (p) =>
                p.firstName.toLowerCase().includes(q) ||
                p.lastName.toLowerCase().includes(q) ||
                String(p.cfid).includes(q)
        );
    }, [players, searchQuery]);

    // ---- Pagination -----------------------------------------------------------
    const totalPages = Math.ceil(filteredPlayers.length / ROWS_PER_PAGE);
    const pageStart = currentPage * ROWS_PER_PAGE;
    const pageEnd = Math.min(pageStart + ROWS_PER_PAGE, filteredPlayers.length);
    const visiblePlayers = filteredPlayers.slice(pageStart, pageEnd);

    // Reset page when filtered list changes
    useEffect(() => {
        setCurrentPage(0);
    }, [searchQuery]);

    // ---- Inline editing -------------------------------------------------------
    const startEditing = (playerIndex: number, field: EditingCell['field'], currentValue: number) => {
        setEditingCell({ playerIndex, field });
        setEditValue(String(currentValue));
    };

    const commitEdit = () => {
        if (!editingCell || !engine) return;
        const value = parseInt(editValue, 10);
        if (isNaN(value)) {
            setEditingCell(null);
            return;
        }

        const { playerIndex, field } = editingCell;

        if (field === 'cfid') {
            if (value < 0 || value > 65535) {
                setToast({ message: 'CFID must be 0–65535', type: 'error' });
                setEditingCell(null);
                return;
            }
            engine.setCFID(playerIndex, value);
        } else {
            const ratingOffset = RATING_FIELD_TO_OFFSET[field];
            if (ratingOffset !== undefined) {
                if (value < 25 || value > 110) {
                    setToast({ message: 'Rating must be 25–110', type: 'error' });
                    setEditingCell(null);
                    return;
                }
                engine.setRating(playerIndex, ratingOffset, value);
            }
        }

        // Re-read the player data
        const updatedPlayer = engine.getPlayer(playerIndex);
        setPlayers((prev) =>
            prev.map((p) => (p.index === playerIndex ? updatedPlayer : p))
        );

        setEditingCell(null);
        setToast({ message: `Updated ${field} for player #${playerIndex}`, type: 'success' });
    };

    const cancelEdit = () => setEditingCell(null);

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') cancelEdit();
    };

    // ---- Export / Save --------------------------------------------------------
    const handleExport = () => {
        if (!engine) return;
        try {
            const data = engine.saveAndRecalculateChecksum();
            const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
            const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName || 'roster.ROS';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setToast({ message: 'File saved with recalculated CRC32 checksum ✓', type: 'success' });
        } catch (err) {
            setToast({ message: `Export failed: ${err instanceof Error ? err.message : 'Unknown'}`, type: 'error' });
        }
    };

    // ---- Rating color class ---------------------------------------------------
    const ratingClass = (value: number): string => {
        if (value >= 75) return 'cell-rating cell-rating--high';
        if (value >= 55) return 'cell-rating cell-rating--mid';
        return 'cell-rating cell-rating--low';
    };

    // ---- Render helper: editable cell -----------------------------------------
    const renderEditable = (
        player: PlayerData,
        field: EditingCell['field'],
        value: number,
        extraClass: string = ''
    ) => {
        const isEditing =
            editingCell?.playerIndex === player.index &&
            editingCell?.field === field;

        if (isEditing) {
            return (
                <input
                    ref={editInputRef}
                    className="cell-input"
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleEditKeyDown}
                />
            );
        }

        return (
            <span
                className={`cell-editable ${extraClass}`}
                onClick={() => startEditing(player.index, field, value)}
                title="Click to edit"
            >
                {value}
            </span>
        );
    };

    // ---- Format file size -----------------------------------------------------
    const formatSize = (bytes: number): string => {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return bytes + ' B';
    };

    // ==========================================================================
    // Render
    // ==========================================================================
    return (
        <div className="app-shell">
            {/* ---- Header -------------------------------------------------------- */}
            <header className="app-header">
                <div className="app-logo">
                    <div className="app-logo-icon">R</div>
                    <div className="app-logo-text">
                        <span>Rostra</span> Editor
                    </div>
                </div>
                <div className="app-header-badges">
                    <span className="badge badge--accent">NBA 2K14</span>
                    <span className="badge badge--info">JS Engine</span>
                    {engine && (
                        <span className="badge badge--success">● Connected</span>
                    )}
                </div>
            </header>

            {/* ---- Upload Zone --------------------------------------------------- */}
            {!engine && (
                <div
                    className={`drop-zone ${isDragging ? 'drop-zone--active' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ROS,.ros"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    {isLoading ? (
                        <>
                            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
                            <p className="drop-zone-title" style={{ marginTop: 16 }}>Parsing roster file…</p>
                        </>
                    ) : (
                        <>
                            <div className="drop-zone-icon">🏀</div>
                            <p className="drop-zone-title">Drop your .ROS file here</p>
                            <p className="drop-zone-subtitle">
                                or <em>click to browse</em> — supports NBA 2K14 roster files
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* ---- Stats Bar ----------------------------------------------------- */}
            {engine && (
                <div className="stats-bar">
                    <div className="stat-item">
                        <div className="stat-value">{players.length}</div>
                        <div className="stat-label">Players</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{formatSize(fileSize)}</div>
                        <div className="stat-label">File Size</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{fileName.split('.')[0] || 'Roster'}</div>
                        <div className="stat-label">File Name</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">CRC32</div>
                        <div className="stat-label">Checksum</div>
                    </div>
                </div>
            )}

            {/* ---- Toolbar ------------------------------------------------------- */}
            {engine && (
                <div className="toolbar">
                    <div className="search-wrapper">
                        <input
                            className="search-input"
                            type="text"
                            placeholder="Search by name or CFID…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button className="btn btn--primary" onClick={handleExport}>
                        💾 Export .ROS
                    </button>

                    <button
                        className="btn btn--secondary"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📂 Open Another
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ROS,.ros"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {/* ---- Data Grid ----------------------------------------------------- */}
            {engine && players.length > 0 && (
                <div className="data-grid-container">
                    <div className="data-grid-scroll">
                        <table className="data-grid">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>First Name</th>
                                    <th>Last Name</th>
                                    <th>Pos</th>
                                    <th>CFID</th>
                                    <th>OVR</th>
                                    <th>3PT</th>
                                    <th>MID</th>
                                    <th>DNK</th>
                                    <th>SPD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePlayers.map((player) => (
                                    <tr key={player.index}>
                                        <td className="cell-index">{player.index}</td>
                                        <td className="cell-name">{player.firstName}</td>
                                        <td className="cell-name">{player.lastName}</td>
                                        <td>
                                            <span className="cell-position">{player.position}</span>
                                        </td>
                                        <td>
                                            {renderEditable(player, 'cfid', player.cfid, 'cell-cfid')}
                                        </td>
                                        <td>
                                            {renderEditable(player, 'overallRating', player.overallRating, ratingClass(player.overallRating))}
                                        </td>
                                        <td>
                                            {renderEditable(player, 'threePointRating', player.threePointRating, ratingClass(player.threePointRating))}
                                        </td>
                                        <td>
                                            {renderEditable(player, 'midRangeRating', player.midRangeRating, ratingClass(player.midRangeRating))}
                                        </td>
                                        <td>
                                            {renderEditable(player, 'dunkRating', player.dunkRating, ratingClass(player.dunkRating))}
                                        </td>
                                        <td>
                                            {renderEditable(player, 'speedRating', player.speedRating, ratingClass(player.speedRating))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ---- Pagination ------------------------------------------------ */}
                    <div className="pagination">
                        <div className="pagination-info">
                            Showing {pageStart + 1}–{pageEnd} of {filteredPlayers.length} players
                            {searchQuery && ` (filtered from ${players.length})`}
                        </div>
                        <div className="pagination-controls">
                            <button
                                className="pagination-btn"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(0)}
                                title="First page"
                            >
                                ⟪
                            </button>
                            <button
                                className="pagination-btn"
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage((p) => p - 1)}
                                title="Previous page"
                            >
                                ‹
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
                                const page = start + i;
                                if (page >= totalPages) return null;
                                return (
                                    <button
                                        key={page}
                                        className={`pagination-btn ${page === currentPage ? 'pagination-btn--active' : ''}`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page + 1}
                                    </button>
                                );
                            })}

                            <button
                                className="pagination-btn"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage((p) => p + 1)}
                                title="Next page"
                            >
                                ›
                            </button>
                            <button
                                className="pagination-btn"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setCurrentPage(totalPages - 1)}
                                title="Last page"
                            >
                                ⟫
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Empty state (file loaded but no players found) ---------------- */}
            {engine && players.length === 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <p className="empty-state-text">
                            No player records found.<br />
                            The player table offset may not match this file. Check that this is an NBA 2K14 .ROS file.
                        </p>
                    </div>
                </div>
            )}

            {/* ---- Status Bar ---------------------------------------------------- */}
            <div className="status-bar">
                <div className="status-bar-item">
                    <div className={`status-dot ${engine ? '' : 'status-dot--idle'}`} />
                    <span>{engine ? 'File loaded – editing active' : 'No file loaded'}</span>
                </div>
                <div className="status-bar-item">
                    <span>Engine: JS Fallback</span>
                </div>
                <div className="status-bar-item">
                    <span>v1.0.0 MVP</span>
                </div>
            </div>

            {/* ---- Toast Notification -------------------------------------------- */}
            {toast && (
                <div className={`toast toast--${toast.type}`}>
                    <span>{toast.type === 'success' ? '✅' : '❌'}</span>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
