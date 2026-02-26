// ============================================================================
// RosterDashboard.tsx — NBA 2K14 .ROS Roster Editor (shadcn/ui v4.0)
// ============================================================================
// Architecture:
//   1. Engine abstraction: Wasm-first with JS fallback (src/engine/)
//   2. Zero-copy file upload (drag-and-drop + file picker)
//   3. shadcn/ui data grid with inline cell editing
//   4. Column sorting, keyboard nav, undo support
//   5. Export with CRC32 checksum recalculation
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { IRosterEngine, PlayerData, EditableField, RatingField, TendencyField, GearField, SignatureField } from '../engine/RosterEngine';
import { createEngine } from '../engine/createEngine';
import { RadarChart } from './RadarChart';
import { toast } from 'sonner';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
    Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
    Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs';

// ============================================================================
// Constants & Types
// ============================================================================

const ROWS_PER_PAGE = 25;

type SortKey = 'index' | 'firstName' | 'lastName' | 'cfid' | 'overallRating'
    | 'threePointRating' | 'midRangeRating' | 'dunkRating' | 'speedRating' | 'position';
type SortDir = 'asc' | 'desc';

type EditingCell = {
    playerIndex: number;
    field: EditableField;
};

interface EditHistoryEntry {
    playerIndex: number;
    field: EditableField;
    oldValue: number;
    newValue: number;
}

// ============================================================================
// Helpers
// ============================================================================

const AttributeGauge: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const getRatingClass = (val: number) => {
        if (val >= 90) return 'elite';
        if (val >= 80) return 'high';
        if (val >= 70) return 'med';
        return 'low';
    };

    const ratingClass = getRatingClass(value);
    const percentage = Math.max(0, Math.min(100, ((value - 25) / (99 - 25)) * 100));

    return (
        <div className="gauge-outer" title={`${label}: ${value}`}>
            <div className="gauge-container">
                <div
                    className={`gauge-bar gauge-${ratingClass}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div className={`gauge-value-mini rating-text-${ratingClass}`}>{value}</div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function RosterDashboard() {
    // ---- Core State -----------------------------------------------------------
    const [players, setPlayers] = useState<PlayerData[]>([]);
    const [engine, setEngine] = useState<IRosterEngine | null>(null);
    const [engineType, setEngineType] = useState<'wasm' | 'js' | null>(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // ---- Performance & File Stats ---------------------------------------------
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [parseTime, setParseTime] = useState(0);

    // ---- Grid View State ------------------------------------------------------
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<SortKey>('index');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);

    // ---- v4.0 shadcn Features State -------------------------------------------
    const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [ratingFilters, setRatingFilters] = useState({ minOverall: 25, minThreePt: 25 });
    const [profileOpen, setProfileOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

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
                    toast.info(`Undo: restored ${last.field} for player #${last.playerIndex}`);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [engine, editHistory]);

    // ---- File processing (async — supports Wasm loading) ----------------------
    const processFile = useCallback(async (buffer: ArrayBuffer, name: string) => {
        setLoading(true);
        const t0 = performance.now();
        try {
            engine?.dispose();

            const eng = await createEngine(buffer);
            const elapsed = performance.now() - t0;

            setEngine(eng);
            setEngineType(eng.type);
            setFileName(name);
            setFileSize(buffer.byteLength);
            setParseTime(Math.round(elapsed));
            setEditHistory([]);
            setSelectedIndices(new Set());
            setSelectedPlayerIndex(null);

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
            toast.success(`Loaded ${count} players via ${engineLabel} engine (${Math.round(elapsed)}ms)`);
        } catch (err) {
            console.error('Failed to parse .ROS file:', err);
            toast.error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
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

        const f = e.dataTransfer.files[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    processFile(reader.result, f.name);
                }
            };
            reader.readAsArrayBuffer(f);
        }
    }, [processFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                    processFile(reader.result, f.name);
                }
            };
            reader.readAsArrayBuffer(f);
        }
        e.target.value = '';
    }, [processFile]);

    // ---- Multi-Select Logic ----
    const handleRowClick = (index: number, e: React.MouseEvent) => {
        if (e.shiftKey && lastClickedIndex !== null) {
            const start = Math.min(lastClickedIndex, index);
            const end = Math.max(lastClickedIndex, index);
            const newSelection = new Set(selectedIndices);
            for (let i = start; i <= end; i++) {
                newSelection.add(i);
            }
            setSelectedIndices(newSelection);
        } else if (e.ctrlKey || e.metaKey) {
            const newSelection = new Set(selectedIndices);
            if (newSelection.has(index)) {
                newSelection.delete(index);
            } else {
                newSelection.add(index);
            }
            setSelectedIndices(newSelection);
        } else {
            setSelectedIndices(new Set([index]));
            setSelectedPlayerIndex(index);
            setProfileOpen(true);
        }
        setLastClickedIndex(index);
    };

    // ---- Search & Filter ------------------------------------------------------
    const filteredPlayers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return players
            .map((p, i) => ({ ...p, originalIndex: i }))
            .filter((p) => {
                const matchesSearch = !q ||
                    p.firstName.toLowerCase().includes(q) ||
                    p.lastName.toLowerCase().includes(q) ||
                    String(p.cfid).includes(q);

                const matchesOverall = p.overallRating >= ratingFilters.minOverall;
                const matchesThreePt = p.threePointRating >= ratingFilters.minThreePt;

                return matchesSearch && matchesOverall && matchesThreePt;
            });
    }, [players, searchQuery, ratingFilters]);

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
    }, [searchQuery, sortKey, sortDir, ratingFilters]);

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
        const oldValue = currentPlayer ? (currentPlayer[field] as number) : 0;

        if (field === 'cfid') {
            if (value < 0 || value > 65535) {
                toast.error('CFID must be 0–65535');
                setEditingCell(null);
                return;
            }
            engine.setCFID(playerIndex, value);
        } else {
            if (value < 25 || value > 110) {
                toast.error('Rating must be 25–110');
                setEditingCell(null);
                return;
            }
            engine.setRating(playerIndex, field as RatingField, value);
        }

        setEditHistory((prev) => [...prev, { playerIndex, field, oldValue, newValue: value }]);

        const updatedPlayer = engine.getPlayer(playerIndex);
        setPlayers((prev) =>
            prev.map((p) => (p.index === playerIndex ? updatedPlayer : p))
        );

        setEditingCell(null);
        toast.success(`Updated ${field} for player #${playerIndex}`);
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
            toast.success('Binary compiled and CRC32 verified ✓');
        } catch (err) {
            toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
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
                <Input
                    ref={editInputRef}
                    className="w-20 h-7 font-mono text-xs"
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
                className={`cursor-text px-2 py-1 rounded-sm font-mono text-sm font-medium transition-colors hover:bg-primary/5 ${extraClass}`}
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

    // ---- Profile player (for Sheet) -------------------------------------------
    const profilePlayer = selectedPlayerIndex !== null ? players[selectedPlayerIndex] : null;

    // ==========================================================================
    // Render
    // ==========================================================================
    return (
        <div className="flex flex-col min-h-screen p-6 max-w-[1440px] mx-auto">
            {/* ---- Header -------------------------------------------------------- */}
            <header className="flex items-center justify-between px-6 py-4 bg-card/85 backdrop-blur-xl border border-border rounded-2xl mb-8 animate-fade-in">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg shadow-primary/25">
                        R
                    </div>
                    <div className="text-xl font-bold tracking-tight">
                        <span className="text-primary">Rostra</span> Editor
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="border-primary/20 text-primary bg-primary/10">NBA 2K14</Badge>
                    {engine && (
                        <Badge variant={engineType === 'wasm' ? 'default' : 'secondary'}>
                            {engineType === 'wasm' ? '⚡ Wasm Engine' : '🔧 JS Engine'}
                        </Badge>
                    )}
                    {engine && (
                        <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/10">
                            ● Connected
                        </Badge>
                    )}
                </div>
            </header>

            {/* ---- Upload Zone --------------------------------------------------- */}
            {!engine && (
                <div
                    className={`relative border-2 border-dashed rounded-2xl py-20 px-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${isDragging
                        ? 'border-primary bg-primary/5 shadow-[0_0_40px_rgba(255,152,0,0.08)]'
                        : 'border-border hover:border-primary/50 bg-gradient-to-br from-primary/5 to-transparent'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ROS,.ros"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    {loading ? (
                        <>
                            <div className="w-12 h-12 border-2 border-border border-t-primary rounded-full animate-spin" />
                            <p className="text-lg font-semibold mt-4">Parsing roster file…</p>
                        </>
                    ) : (
                        <>
                            <div className="text-5xl mb-4 drop-shadow-[0_4px_12px_rgba(255,152,0,0.2)]">🏀</div>
                            <p className="text-lg font-semibold">Drop your .ROS file here</p>
                            <p className="text-muted-foreground text-sm">
                                or <span className="text-primary font-medium">click to browse</span> — supports NBA 2K14 roster files
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* ---- Stats Bar ----------------------------------------------------- */}
            {engine && (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-8 animate-slide-up">
                    {[
                        { value: players.length, label: 'Players' },
                        { value: formatSize(fileSize), label: 'File Size' },
                        { value: `${parseTime}ms`, label: 'Parse Time' },
                        { value: fileName.split('.')[0] || 'Roster', label: 'File Name' },
                        { value: 'CRC32', label: 'Checksum' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-card border border-border rounded-xl p-4 text-center transition-all hover:border-border hover:-translate-y-0.5 hover:shadow-md group">
                            <div className="text-2xl font-extrabold font-mono bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent leading-tight">
                                {stat.value}
                            </div>
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ---- Toolbar ------------------------------------------------------- */}
            {engine && (
                <div className="flex flex-col gap-4 mb-6 p-6 bg-card border border-border rounded-2xl animate-fade-in">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative flex-1 min-w-[220px]">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm opacity-60 pointer-events-none">🔍</span>
                            <Input
                                className="pl-10"
                                placeholder="Search players by name or CFID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleExport}>
                                💾 Export .ROS
                            </Button>
                            {editHistory.length > 0 && (
                                <Button
                                    variant="secondary"
                                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))}
                                >
                                    ↩ Undo ({editHistory.length})
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                📂 Change File
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-8 pt-3 border-t border-border">
                        <div className="flex items-center gap-3 flex-1 max-w-[300px]">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[72px]">
                                Min Overall
                            </label>
                            <Slider
                                min={25} max={99}
                                value={[ratingFilters.minOverall]}
                                onValueChange={(val) => setRatingFilters(prev => ({ ...prev, minOverall: val[0] }))}
                            />
                            <span className="font-mono text-sm font-bold text-primary min-w-[28px] text-right">
                                {ratingFilters.minOverall}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 flex-1 max-w-[300px]">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap min-w-[72px]">
                                Min 3PT
                            </label>
                            <Slider
                                min={25} max={99}
                                value={[ratingFilters.minThreePt]}
                                onValueChange={(val) => setRatingFilters(prev => ({ ...prev, minThreePt: val[0] }))}
                            />
                            <span className="font-mono text-sm font-bold text-primary min-w-[28px] text-right">
                                {ratingFilters.minThreePt}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Batch Actions Bar ---- */}
            {selectedIndices.size > 1 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-card/92 backdrop-blur-xl border border-border rounded-3xl shadow-2xl z-50 animate-slide-up">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-extrabold text-xs rounded-full shadow-md">
                            {selectedIndices.size}
                        </span>
                        <span>players selected</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => {
                                const cfid = prompt('Enter CFID for selected players:');
                                if (cfid !== null && engine) {
                                    const val = parseInt(cfid, 10);
                                    if (isNaN(val) || val < 0 || val > 65535) {
                                        toast.error('CFID must be 0–65535');
                                        return;
                                    }
                                    selectedIndices.forEach(idx => {
                                        engine.setCFID(idx, val);
                                    });
                                    toast.success(`Updated CFID to ${val} for ${selectedIndices.size} players`);
                                    const count = engine.getPlayerCount();
                                    const newList: PlayerData[] = [];
                                    for (let i = 0; i < count; i++) newList.push(engine.getPlayer(i));
                                    setPlayers(newList);
                                }
                            }}
                        >
                            Mass Update CFID
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedIndices(new Set())}>
                            Clear Selection
                        </Button>
                    </div>
                </div>
            )}

            {/* ---- Data Grid ----------------------------------------------------- */}
            {engine && players.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-border animate-fade-in">
                    <div className="overflow-auto max-h-[520px]">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary/50">
                                    {([
                                        ['index', '#'],
                                        ['firstName', 'First Name'],
                                        ['lastName', 'Last Name'],
                                        ['position', 'Pos'],
                                        ['cfid', 'CFID'],
                                        ['overallRating', 'OVR'],
                                        ['threePointRating', '3PT'],
                                        ['midRangeRating', 'MID'],
                                        ['dunkRating', 'DNK'],
                                        ['speedRating', 'SPD'],
                                    ] as [SortKey, string][]).map(([key, label]) => (
                                        <TableHead
                                            key={key}
                                            className="cursor-pointer select-none hover:text-primary transition-colors text-xs uppercase tracking-wider"
                                            onClick={() => handleSort(key)}
                                        >
                                            {label}{sortIndicator(key)}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visiblePlayers.map((player) => {
                                    const isRowSelected = selectedIndices.has(player.originalIndex);
                                    return (
                                        <TableRow
                                            key={player.index}
                                            className={`cursor-pointer transition-colors ${isRowSelected ? 'bg-primary/5 shadow-[inset_3px_0_0_hsl(var(--primary))]' : ''
                                                }`}
                                            onClick={(e) => handleRowClick(player.originalIndex, e)}
                                        >
                                            <TableCell className="text-muted-foreground font-mono text-xs">
                                                {player.index}
                                            </TableCell>
                                            <TableCell className="font-medium">{player.firstName}</TableCell>
                                            <TableCell className="font-medium">{player.lastName}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="text-xs">
                                                    {player.position}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {renderEditable(player, 'cfid', player.cfid, 'text-primary font-semibold')}
                                            </TableCell>
                                            <TableCell onClick={(e) => { e.stopPropagation(); startEditing(player.index, 'overallRating', player.overallRating); }}>
                                                <AttributeGauge label="OVR" value={player.overallRating} />
                                            </TableCell>
                                            <TableCell onClick={(e) => { e.stopPropagation(); startEditing(player.index, 'threePointRating', player.threePointRating); }}>
                                                <AttributeGauge label="3PT" value={player.threePointRating} />
                                            </TableCell>
                                            <TableCell onClick={(e) => { e.stopPropagation(); startEditing(player.index, 'midRangeRating', player.midRangeRating); }}>
                                                <AttributeGauge label="MID" value={player.midRangeRating} />
                                            </TableCell>
                                            <TableCell onClick={(e) => { e.stopPropagation(); startEditing(player.index, 'dunkRating', player.dunkRating); }}>
                                                <AttributeGauge label="DNK" value={player.dunkRating} />
                                            </TableCell>
                                            <TableCell onClick={(e) => { e.stopPropagation(); startEditing(player.index, 'speedRating', player.speedRating); }}>
                                                <AttributeGauge label="SPD" value={player.speedRating} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* ---- Pagination ------------------------------------------------ */}
                    <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card">
                        <div className="text-sm text-muted-foreground">
                            Showing {pageStart + 1}–{pageEnd} of {sortedPlayers.length} players
                            {searchQuery && ` (filtered from ${players.length})`}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon-xs" disabled={currentPage === 0} onClick={() => setCurrentPage(0)} title="First page">⟪</Button>
                            <Button variant="outline" size="icon-xs" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => p - 1)} title="Previous page">‹</Button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
                                const page = start + i;
                                if (page >= totalPages) return null;
                                return (
                                    <Button
                                        key={page}
                                        variant={page === currentPage ? 'default' : 'outline'}
                                        size="icon-xs"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page + 1}
                                    </Button>
                                );
                            })}
                            <Button variant="outline" size="icon-xs" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((p) => p + 1)} title="Next page">›</Button>
                            <Button variant="outline" size="icon-xs" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(totalPages - 1)} title="Last page">⟫</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Empty state (file loaded but no players found) ---------------- */}
            {engine && players.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-16 mt-4 flex flex-col items-center text-center">
                    <div className="text-5xl opacity-30 mb-4">📭</div>
                    <p className="text-muted-foreground text-sm">
                        No player records found.<br />
                        The player table offset may not match this file. Check that this is an NBA 2K14 .ROS file.
                    </p>
                </div>
            )}

            {/* ---- Profile Sheet (shadcn) ---- */}
            <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
                <SheetContent side="right" className="w-[420px] sm:max-w-[420px] overflow-y-auto">
                    {profilePlayer && (
                        <>
                            <SheetHeader className="bg-gradient-to-b from-primary/5 to-transparent border-b border-border pb-4">
                                <div className="flex items-center gap-3">
                                    <SheetTitle className="text-2xl font-extrabold">
                                        {profilePlayer.firstName} {profilePlayer.lastName}
                                    </SheetTitle>
                                    <Badge variant="secondary">{profilePlayer.position}</Badge>
                                </div>
                                <SheetDescription className="font-mono text-primary font-semibold">
                                    CFID: {profilePlayer.cfid}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="p-6 space-y-6">
                                <Tabs defaultValue="core">
                                    <TabsList className="w-full">
                                        <TabsTrigger value="core">Core</TabsTrigger>
                                        <TabsTrigger value="tendencies">Tendencies</TabsTrigger>
                                        <TabsTrigger value="gear">Gear & Sigs</TabsTrigger>
                                    </TabsList>

                                    {/* ---- Tab: Core ---- */}
                                    <TabsContent value="core" className="space-y-6 mt-4">
                                        {/* Radar Chart */}
                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Attribute Visualization
                                            </h3>
                                            <RadarChart player={profilePlayer} />
                                        </div>

                                        {/* Stat Cards */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-secondary border border-border rounded-xl p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm">
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall</div>
                                                <div className={`text-3xl font-black font-mono ${profilePlayer.overallRating >= 80 ? 'rating-text-high' : 'rating-text-med'}`}>
                                                    {profilePlayer.overallRating}
                                                </div>
                                            </div>
                                            <div className="bg-secondary border border-border rounded-xl p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-sm">
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">3-Point</div>
                                                <div className="text-3xl font-black font-mono">
                                                    {profilePlayer.threePointRating}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Detail Bars */}
                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Core Ratings
                                            </h3>
                                            <div className="space-y-4">
                                                {([
                                                    ['Mid-Range', profilePlayer.midRangeRating],
                                                    ['Dunk', profilePlayer.dunkRating],
                                                    ['Speed', profilePlayer.speedRating],
                                                ] as [string, number][]).map(([name, val]) => (
                                                    <div key={name} className="grid grid-cols-[80px_1fr_36px] items-center gap-4">
                                                        <span className="text-sm font-medium text-muted-foreground">{name}</span>
                                                        <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                                                style={{ width: `${val}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-mono text-sm font-bold text-right">{val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* ---- Tab: Tendencies ---- */}
                                    <TabsContent value="tendencies" className="space-y-5 mt-4">
                                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                            Player Tendencies (0–100)
                                        </h3>
                                        {([
                                            ['Stepback 3PT', 'tendencyStepbackShot3Pt'],
                                            ['Driving Layup', 'tendencyDrivingLayup'],
                                            ['Standing Dunk', 'tendencyStandingDunk'],
                                            ['Driving Dunk', 'tendencyDrivingDunk'],
                                            ['Post Hook', 'tendencyPostHook'],
                                        ] as [string, TendencyField][]).map(([label, field]) => {
                                            const rawVal = profilePlayer[field];
                                            // Display raw 0-255 as percentage 0-100 for the slider
                                            const displayVal = Math.round((rawVal / 255) * 100);
                                            return (
                                                <div key={field} className="space-y-1.5">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-sm font-medium">{label}</label>
                                                        <span className="font-mono text-sm font-bold text-primary min-w-[36px] text-right">
                                                            {displayVal}
                                                        </span>
                                                    </div>
                                                    <Slider
                                                        min={0}
                                                        max={100}
                                                        step={1}
                                                        value={[displayVal]}
                                                        onValueChange={(val) => {
                                                            if (!engine) return;
                                                            const newRaw = Math.round((val[0] / 100) * 255);
                                                            engine.setTendency(profilePlayer.index, field, newRaw);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                                            Values are mapped from 0–255 (binary) to 0–100 (display). Add more tendencies by following the pattern in <code className="bg-muted px-1 rounded">RosterEditor.cpp</code>.
                                        </p>
                                    </TabsContent>

                                    {/* ---- Tab: Gear & Signatures ---- */}
                                    <TabsContent value="gear" className="space-y-6 mt-4">
                                        {/* Gear Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Gear & Accessories
                                            </h3>
                                            {([
                                                ['Accessory Flag', 'gearAccessoryFlag', 1],
                                                ['Elbow Pad', 'gearElbowPad', 7],
                                                ['Wrist Band', 'gearWristBand', 7],
                                                ['Headband', 'gearHeadband', 15],
                                                ['Socks', 'gearSocks', 15],
                                            ] as [string, GearField, number][]).map(([label, field, maxVal]) => (
                                                <div key={field} className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <label className="text-sm font-medium text-muted-foreground">{label}</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={maxVal}
                                                        className="w-24 h-8 font-mono text-sm"
                                                        value={profilePlayer[field]}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            const val = Math.max(0, Math.min(maxVal, parseInt(e.target.value, 10) || 0));
                                                            engine.setGear(profilePlayer.index, field, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            toast.success(`Updated ${label}`);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Signature Animations Section */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Signature Animations
                                            </h3>
                                            {([
                                                ['Shot Form', 'sigShotForm'],
                                                ['Shot Base', 'sigShotBase'],
                                            ] as [string, SignatureField][]).map(([label, field]) => (
                                                <div key={field} className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <label className="text-sm font-medium text-muted-foreground">{label}</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={255}
                                                        className="w-24 h-8 font-mono text-sm"
                                                        value={profilePlayer[field]}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            const val = Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0));
                                                            engine.setSignature(profilePlayer.index, field, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            toast.success(`Updated ${label}`);
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                                            Gear values are bit-packed (1–4 bits). Signature IDs are byte-aligned (0–255). Extend with more fields using the pattern in <code className="bg-muted px-1 rounded">RosterEditor.cpp</code>.
                                        </p>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* ---- Status Bar ---------------------------------------------------- */}
            <div className="flex items-center justify-between px-4 py-2 bg-card border border-border rounded-xl mt-6 text-xs text-muted-foreground animate-fade-in">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${engine ? 'bg-green-500 shadow-[0_0_6px_rgb(74,222,128)]' : 'bg-muted-foreground'}`} />
                    <span>{engine ? 'File loaded – editing active' : 'No file loaded'}</span>
                </div>
                <div>
                    Engine: {engineType === 'wasm' ? '⚡ Native C++ (Wasm)' : '🔧 JS Fallback'}
                </div>
                <div>
                    v4.0.0 shadcn/ui • {editHistory.length} unsaved edits
                </div>
            </div>
        </div>
    );
}
