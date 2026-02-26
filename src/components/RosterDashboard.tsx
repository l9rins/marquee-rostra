// ============================================================================
// RosterDashboard.tsx — Main UI for the NBA 2K14 .ROS Roster Editor
// ============================================================================
// Architecture:
//   1. Engine abstraction: Wasm-first with JS fallback (src/engine/)
//   2. Zero-copy file upload (drag-and-drop + file picker)
//   3. Editable data grid with inline cell editing
//   4. Column sorting, keyboard nav, undo support
//   5. Export with CRC32 checksum recalculation
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { IRosterEngine, PlayerData, EditableField, RatingField, EngineType } from '../engine/RosterEngine';
import { createEngine } from '../engine/createEngine';

// ============================================================================
// Constants
// ============================================================================

const ROWS_PER_PAGE = 25;

type SortKey = 'index' | 'firstName' | 'lastName' | 'cfid' | 'overallRating'
    | 'threePointRating' | 'midRangeRating' | 'dunkRating' | 'speedRating' | 'position';
type SortDir = 'asc' | 'desc';

type EditingCell = {
    playerIndex: number;
    field: EditableField;
};

type ToastState = {
    message: string;
    type: 'success' | 'error' | 'info';
} | null;

interface EditHistoryEntry {
    playerIndex: number;
    field: EditableField;
    oldValue: number;
    newValue: number;
}

// ============================================================================
// Component
// ============================================================================

export default function RosterDashboard() {
    // ---- State ----------------------------------------------------------------
    const [engine, setEngine] = useState<IRosterEngine | null>(null);
    const [engineType, setEngineType] = useState<EngineType>('js');
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [parseTimeMs, setParseTimeMs] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState('');
    const [toast, setToast] = useState<ToastState>(null);
    const [sortKey, setSortKey] = useState<SortKey>('index');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);

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

    // ---- Dispose engine on unmount / new file ----------------------------------
    useEffect(() => {
        return () => {
            engine?.dispose();
        };
    }, [engine]);

    // ---- Ctrl+Z undo ----------------------------------------------------------
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && editHistory.length > 0) {
                e.preventDefault();
                const last = editHistory[editHistory.length - 1];
                if (engine) {
                    if (last.field === 'cfid') {
                        engine.setCFID(last.playerIndex, last.oldValue);
                    } else {
                        engine.setRating(last.playerIndex, last.field as RatingField, last.oldValue);
                    }
                    const updatedPlayer = engine.getPlayer(last.playerIndex);
                    setPlayers((prev) =>
                        prev.map((p) => (p.index === last.playerIndex ? updatedPlayer : p))
                    );
                    setEditHistory((prev) => prev.slice(0, -1));
                    setToast({ message: `Undo: restored ${last.field} for player #${last.playerIndex}`, type: 'info' });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [engine, editHistory]);

    // ---- File processing (async — supports Wasm loading) ----------------------
    const processFile = useCallback(async (buffer: ArrayBuffer, name: string) => {
        setIsLoading(true);
        const t0 = performance.now();
        try {
            // Dispose previous engine if any
            engine?.dispose();

            const eng = await createEngine(buffer);
            const elapsed = performance.now() - t0;

            setEngine(eng);
            setEngineType(eng.type);
            setFileName(name);
            setFileSize(buffer.byteLength);
            setParseTimeMs(Math.round(elapsed));
            setEditHistory([]);

            const count = eng.getPlayerCount();
            const playerList: PlayerData[] = [];
            for (let i = 0; i < count; i++) {
                playerList.push(eng.getPlayer(i));
            }
            setPlayers(playerList);
            setCurrentPage(0);
            setSearchQuery('');
            setSortKey('index');
            setSortDir('asc');

            const engineLabel = eng.type === 'wasm' ? '⚡ Wasm C++' : '🔧 JS';
            setToast({
                message: `Loaded ${count} players via ${engineLabel} engine (${Math.round(elapsed)}ms)`,
                type: 'success',
            });
        } catch (err) {
            console.error('Failed to parse .ROS file:', err);
            setToast({
                message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    }, [engine]);

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

    // ---- Sorting --------------------------------------------------------------
    const sortedPlayers = useMemo(() => {
        const sorted = [...filteredPlayers];
        sorted.sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                const cmp = aVal.localeCompare(bVal);
                return sortDir === 'asc' ? cmp : -cmp;
            }
            const cmp = (aVal as number) - (bVal as number);
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [filteredPlayers, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortIndicator = (key: SortKey) => {
        if (sortKey !== key) return '';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    // ---- Pagination -----------------------------------------------------------
    const totalPages = Math.ceil(sortedPlayers.length / ROWS_PER_PAGE);
    const pageStart = currentPage * ROWS_PER_PAGE;
    const pageEnd = Math.min(pageStart + ROWS_PER_PAGE, sortedPlayers.length);
    const visiblePlayers = sortedPlayers.slice(pageStart, pageEnd);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchQuery, sortKey, sortDir]);

    // ---- Inline editing -------------------------------------------------------
    const startEditing = (playerIndex: number, field: EditableField, currentValue: number) => {
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
        const currentPlayer = players.find((p) => p.index === playerIndex);
        const oldValue = currentPlayer ? currentPlayer[field] as number : 0;

        if (field === 'cfid') {
            if (value < 0 || value > 65535) {
                setToast({ message: 'CFID must be 0–65535', type: 'error' });
                setEditingCell(null);
                return;
            }
            engine.setCFID(playerIndex, value);
        } else {
            if (value < 25 || value > 110) {
                setToast({ message: 'Rating must be 25–110', type: 'error' });
                setEditingCell(null);
                return;
            }
            engine.setRating(playerIndex, field as RatingField, value);
        }

        // Record for undo
        setEditHistory((prev) => [...prev, { playerIndex, field, oldValue, newValue: value }]);

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
            setToast({ message: 'Binary compiled and CRC32 verified ✓', type: 'success' });
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
        field: EditableField,
        value: number,
        extraClass = ''
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
                    {engine && (
                        <span className={`badge ${engineType === 'wasm' ? 'badge--wasm' : 'badge--info'}`}>
                            {engineType === 'wasm' ? '⚡ Wasm Engine' : '🔧 JS Engine'}
                        </span>
                    )}
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
                        <div className="stat-value">{parseTimeMs}ms</div>
                        <div className="stat-label">Parse Time</div>
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

                    {editHistory.length > 0 && (
                        <button
                            className="btn btn--secondary"
                            onClick={() => {
                                // Trigger undo via keyboard event simulation
                                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
                            }}
                            title={`${editHistory.length} edit(s) — Ctrl+Z to undo`}
                        >
                            ↩ Undo ({editHistory.length})
                        </button>
                    )}

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
                                    <th className="sortable-th" onClick={() => handleSort('index')}>
                                        #{sortIndicator('index')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('firstName')}>
                                        First Name{sortIndicator('firstName')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('lastName')}>
                                        Last Name{sortIndicator('lastName')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('position')}>
                                        Pos{sortIndicator('position')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('cfid')}>
                                        CFID{sortIndicator('cfid')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('overallRating')}>
                                        OVR{sortIndicator('overallRating')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('threePointRating')}>
                                        3PT{sortIndicator('threePointRating')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('midRangeRating')}>
                                        MID{sortIndicator('midRangeRating')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('dunkRating')}>
                                        DNK{sortIndicator('dunkRating')}
                                    </th>
                                    <th className="sortable-th" onClick={() => handleSort('speedRating')}>
                                        SPD{sortIndicator('speedRating')}
                                    </th>
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
                            Showing {pageStart + 1}–{pageEnd} of {sortedPlayers.length} players
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
                    <span>
                        Engine: {engineType === 'wasm' ? '⚡ Native C++ (Wasm)' : '🔧 JS Fallback'}
                    </span>
                </div>
                <div className="status-bar-item">
                    <span>v2.0.0{editHistory.length > 0 ? ` • ${editHistory.length} unsaved edit(s)` : ''}</span>
                </div>
            </div>

            {/* ---- Toast Notification -------------------------------------------- */}
            {toast && (
                <div className={`toast toast--${toast.type}`}>
                    <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
