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
import type { IRosterEngine, PlayerData, EditableField, RatingField } from '../engine/RosterEngine';
import {
    RATING_DEFS, TENDENCY_DEFS, HOT_ZONE_NAMES, HOT_ZONE_VALUES, ANIMATION_DEFS, GEAR_DEFS,
    VITAL_POSITION, VITAL_HEIGHT, VITAL_WEIGHT, VITAL_BIRTH_DAY, VITAL_BIRTH_MONTH, VITAL_BIRTH_YEAR, VITAL_HAND, VITAL_YEARS_PRO,
    PLAY_STYLE_NAMES, PLAY_TYPE_NAMES, CONTRACT_OPT_NAMES,
    VITAL_JERSEY_NUM, VITAL_TEAM_ID1, VITAL_TEAM_ID2, VITAL_CONTRACT_Y1,
    VITAL_CONTRACT_OPT, VITAL_NO_TRADE, VITAL_INJURY_TYPE, VITAL_INJURY_DAYS,
    VITAL_PLAY_STYLE, VITAL_PLAY_TYPE1,
    VITAL_SKIN_TONE, VITAL_BODY_TYPE, VITAL_MUSCLE_TONE, VITAL_HAIR_TYPE, VITAL_HAIR_COLOR,
    VITAL_EYE_COLOR, VITAL_EYEBROW, VITAL_MUSTACHE, VITAL_FCL_HAIR_CLR, VITAL_BEARD, VITAL_GOATEE,
    VITAL_SEC_POS, VITAL_DRAFT_YEAR, VITAL_DRAFT_ROUND, VITAL_DRAFT_PICK, VITAL_DRAFT_TEAM,
    VITAL_NICKNAME, VITAL_PLAY_INITIATOR, VITAL_GOES_TO_3PT,
    VITAL_PEAK_AGE_START, VITAL_PEAK_AGE_END, VITAL_POTENTIAL, VITAL_LOYALTY, VITAL_FINANCIAL_SECURITY, VITAL_PLAY_FOR_WINNER,
    BODY_TYPE_NAMES, MUSCLE_TONE_NAMES, HAIR_COLOR_NAMES, EYE_COLOR_NAMES, HAIR_TYPE_NAMES, NICKNAME_NAMES, INJURY_TYPE_NAMES, SIG_SKILL_NAMES
} from '../engine/RosterEngine';
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
import {
    Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExportDialog } from './ExportDialog';

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
    field: string; // EditableField for grid edits, or descriptive IDs like 'vital_42', 'gear_3', etc.
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
    const [teams, setTeams] = useState<import('../engine/RosterEngine').TeamData[]>([]);
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
    const [selectedTeamIndex, setSelectedTeamIndex] = useState<number | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
    const [ratingFilters, setRatingFilters] = useState({ minOverall: 25, minThreePt: 25 });
    const [profileOpen, setProfileOpen] = useState(false);
    const [teamSheetOpen, setTeamSheetOpen] = useState(false);

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
                    // Only grid edits (cfid + ratings) can be undone via simple set
                    if (last.field === 'cfid') {
                        engine.setCFID(last.playerIndex, last.oldValue);
                    } else if (!last.field.includes('_')) {
                        // Rating fields don't contain underscores
                        engine.setRating(last.playerIndex, last.field as RatingField, last.oldValue);
                    } else {
                        // Profile-panel edits (vital_X, gear_X, etc.) — just remove from history
                        setEditHistory((prev) => prev.slice(0, -1));
                        toast.info(`Removed edit record for ${last.field}`);
                        return;
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

    // ---- Unsaved-changes guard ------------------------------------------------
    useEffect(() => {
        if (editHistory.length === 0) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [editHistory.length]);

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

            // Extract Teams
            const teamCount = eng.getTeamCount();
            const teamList: import('../engine/RosterEngine').TeamData[] = [];
            for (let i = 0; i < teamCount; i++) {
                teamList.push(eng.getTeam(i));
            }
            setTeams(teamList);

            setCurrentPage(0);
            setSearchQuery('');
            setSortKey('index');
            setSortDir('asc');

            const engineLabel = eng.type === 'wasm' ? '⚡ Wasm C++' : '🔧 JS';
            toast.success(`Loaded ${count} players & ${teamCount} teams via ${engineLabel} engine (${Math.round(elapsed)}ms)`);
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
    const affectedPlayerCount = useMemo(() => {
        const indices = new Set(editHistory.map(e => e.playerIndex));
        return indices.size;
    }, [editHistory]);

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
            const count = editHistory.length;
            const pCount = affectedPlayerCount;
            setEditHistory([]);
            toast.success(`Exported ${fileName} — ${count} edits across ${pCount} player${pCount !== 1 ? 's' : ''}, CRC32 verified ✓`);
        } catch (err) {
            toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
    };

    // ---- Profile-panel edit tracking ------------------------------------------
    const trackEdit = useCallback((playerIndex: number, field: string, oldValue: number, newValue: number) => {
        setEditHistory((prev) => [...prev, { playerIndex, field, oldValue, newValue }]);
    }, []);

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

            {engine && (
                <Tabs defaultValue="players" className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-secondary/50 border border-border">
                            <TabsTrigger value="players" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Players ({players.length})
                            </TabsTrigger>
                            <TabsTrigger value="teams" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Teams ({teams.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="players" className="mt-0 focus-visible:outline-none">
                        {/* ---- Toolbar ------------------------------------------------------- */}
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
                                    <ExportDialog
                                        fileName={fileName || 'roster.ROS'}
                                        editCount={editHistory.length}
                                        affectedPlayerCount={affectedPlayerCount}
                                        disabled={editHistory.length === 0}
                                        onConfirm={handleExport}
                                    />
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
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (!engine || !confirm(`Release ${selectedIndices.size} players to Free Agency?`)) return;
                                            let successCount = 0;
                                            selectedIndices.forEach(idx => {
                                                try {
                                                    engine.updateRosterAssignment(idx, null);
                                                    successCount++;
                                                } catch (err) {
                                                    console.error(`Failed to release player ${idx}`, err);
                                                }
                                            });
                                            toast.success(`Released ${successCount} players to Free Agency.`);

                                            // Sync state
                                            const count = engine.getPlayerCount();
                                            const newList: PlayerData[] = [];
                                            for (let i = 0; i < count; i++) newList.push(engine.getPlayer(i));
                                            setPlayers(newList);

                                            const teamCount = engine.getTeamCount();
                                            const newTeams = [];
                                            for (let i = 0; i < teamCount; i++) newTeams.push(engine.getTeam(i));
                                            setTeams(newTeams);

                                            setSelectedIndices(new Set());
                                        }}
                                    >
                                        Release Selected
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedIndices(new Set())}>
                                        Clear Selection
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ---- Data Grid ----------------------------------------------------- */}
                        {players.length > 0 && (
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
                    </TabsContent>

                    <TabsContent value="teams" className="mt-0 focus-visible:outline-none">
                        <div className="bg-card border border-border rounded-2xl p-8 mb-6 animate-fade-in min-h-[500px]">
                            {teams.length > 0 ? (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
                                    {teams.map((team, idx) => {
                                        // Colors are stored ARGB format
                                        const c1 = `#${(team.color1 & 0xFFFFFF).toString(16).padStart(6, '0')}`;
                                        const c2 = `#${(team.color2 & 0xFFFFFF).toString(16).padStart(6, '0')}`;

                                        return (
                                            <div key={idx} className="flex flex-col border border-border rounded-2xl overflow-hidden bg-background">
                                                {/* Team Header banner with colors */}
                                                <div className="h-16 w-full flex">
                                                    <div className="flex-1" style={{ backgroundColor: c1 }}></div>
                                                    <div className="w-1/3" style={{ backgroundColor: c2 }}></div>
                                                </div>
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-black tracking-tight">{team.city} {team.name}</h3>
                                                            <div className="text-sm font-semibold text-muted-foreground">{team.abbr}</div>
                                                        </div>
                                                        <Badge variant="outline" className="font-mono bg-secondary/50">ID {team.teamId}</Badge>
                                                    </div>

                                                    <div className="text-sm font-medium text-muted-foreground mb-2 mt-4 flex justify-between items-center">
                                                        <span>Active Roster</span>
                                                        <Badge variant="secondary">{team.rosterIndices.filter(id => id !== 65535 && id !== 0).length}/15</Badge>
                                                    </div>

                                                    <div className="flex -space-x-2 overflow-hidden py-1">
                                                        {team.rosterIndices.slice(0, 8).map((pid, rIdx) => {
                                                            if (pid === 65535 || pid === 0 || pid >= players.length) return null;
                                                            return (
                                                                <div key={rIdx} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] font-bold" title={`ID: ${pid}`}>
                                                                    {pid}
                                                                </div>
                                                            );
                                                        })}
                                                        {team.rosterIndices.filter(id => id !== 65535 && id !== 0).length > 8 && (
                                                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                                                                +
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center mt-6">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full gap-2 font-bold uppercase tracking-tight"
                                                            onClick={() => {
                                                                setSelectedTeamIndex(idx);
                                                                setTeamSheetOpen(true);
                                                            }}
                                                        >
                                                            <span>✏️</span> Edit Team
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                    <div className="text-4xl opacity-30 mb-4">🛡️</div>
                                    <p className="text-muted-foreground">No team data extracted or table not found.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
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
                                    <TabsList className="w-full grid grid-cols-4 h-auto gap-1 p-1">
                                        <TabsTrigger value="core">Core</TabsTrigger>
                                        <TabsTrigger value="bio">Bio</TabsTrigger>
                                        <TabsTrigger value="ratings">Ratings</TabsTrigger>
                                        <TabsTrigger value="tendencies">Tendencies</TabsTrigger>
                                        <TabsTrigger value="hotzones">Hot Zones</TabsTrigger>
                                        <TabsTrigger value="animations">Anim & Sigs</TabsTrigger>
                                        <TabsTrigger value="gear">Gear</TabsTrigger>
                                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                                        <TabsTrigger value="status">Status</TabsTrigger>
                                        <TabsTrigger value="mentality">Mentality</TabsTrigger>
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

                                    {/* ---- Tab: Bio & Vitals ---- */}
                                    <TabsContent value="bio" className="space-y-6 mt-4">
                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Physicals
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Height (cm)</span>
                                                    <Slider
                                                        min={150} max={250} step={1}
                                                        value={[profilePlayer.vitals?.[VITAL_HEIGHT] || 200]}
                                                        onValueChange={([val]) => {
                                                            if (!engine) return;
                                                            trackEdit(profilePlayer.index, 'vital_height', profilePlayer.vitals?.[VITAL_HEIGHT] || 0, val);
                                                            engine.setVitalById(profilePlayer.index, VITAL_HEIGHT, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    />
                                                    <Input type="number" readOnly className="h-7 w-14 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_HEIGHT] || 0} />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Weight (lbs)</span>
                                                    <Slider
                                                        min={150} max={350} step={1}
                                                        value={[(profilePlayer.vitals?.[VITAL_WEIGHT] || 0) + 100]}
                                                        onValueChange={([val]) => {
                                                            if (!engine) return;
                                                            const actualWeight = Math.max(0, val - 100);
                                                            trackEdit(profilePlayer.index, 'vital_weight', profilePlayer.vitals?.[VITAL_WEIGHT] || 0, actualWeight);
                                                            engine.setVitalById(profilePlayer.index, VITAL_WEIGHT, actualWeight);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    />
                                                    <Input type="number" readOnly className="h-7 w-14 font-mono text-xs text-right p-1" value={(profilePlayer.vitals?.[VITAL_WEIGHT] || 0) + 100} />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Position</span>
                                                    <select
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                        value={profilePlayer.vitals?.[VITAL_POSITION] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            const val = parseInt(e.target.value, 10);
                                                            trackEdit(profilePlayer.index, 'vital_position', profilePlayer.vitals?.[VITAL_POSITION] || 0, val);
                                                            engine.setVitalById(profilePlayer.index, VITAL_POSITION, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    >
                                                        <option value="0">Point Guard (PG)</option>
                                                        <option value="1">Shooting Guard (SG)</option>
                                                        <option value="2">Small Forward (SF)</option>
                                                        <option value="3">Power Forward (PF)</option>
                                                        <option value="4">Center (C)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Identifiers & Team
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Assignment</span>
                                                    <Select
                                                        value={(() => {
                                                            const idx = teams.findIndex(t => t.teamId === profilePlayer.vitals?.[VITAL_TEAM_ID1]);
                                                            return idx === -1 ? "fa" : idx.toString();
                                                        })()}
                                                        onValueChange={(v) => {
                                                            if (!engine) return;
                                                            const newTeamIndex = v === "fa" ? null : parseInt(v, 10);
                                                            try {
                                                                engine.updateRosterAssignment(profilePlayer.index, newTeamIndex);

                                                                // Sync state
                                                                const updatedPlayer = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updatedPlayer : p));

                                                                const teamCount = engine.getTeamCount();
                                                                const newTeams = [];
                                                                for (let i = 0; i < teamCount; i++) newTeams.push(engine.getTeam(i));
                                                                setTeams(newTeams);

                                                                toast.success(newTeamIndex === null ? "Released to free agency" : "Trade successful");
                                                            } catch (err) {
                                                                toast.error(err instanceof Error ? err.message : "Roster move failed");
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="fa">Free Agency / Unassigned</SelectItem>
                                                            {teams.map((t, idx) => (
                                                                <SelectItem key={idx} value={idx.toString()}>
                                                                    {t.city} {t.name} ({t.rosterIndices.filter(rid => rid !== 65535 && rid !== 0).length}/15)
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Hand</span>
                                                    <select
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                        value={profilePlayer.vitals?.[VITAL_HAND] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_HAND, parseInt(e.target.value, 10));
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    >
                                                        <option value="0">Right</option>
                                                        <option value="1">Left</option>
                                                        <option value="2">Both</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Jersey #</span>
                                                    <Slider
                                                        min={0} max={99} step={1}
                                                        value={[profilePlayer.vitals?.[VITAL_JERSEY_NUM] || 0]}
                                                        onValueChange={([val]) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_JERSEY_NUM, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    />
                                                    <Input type="number" readOnly className="h-7 w-14 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_JERSEY_NUM] || 0} />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Years Pro</span>
                                                    <Slider
                                                        min={0} max={25} step={1}
                                                        value={[profilePlayer.vitals?.[VITAL_YEARS_PRO] || 0]}
                                                        onValueChange={([val]) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_YEARS_PRO, val);
                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                        }}
                                                    />
                                                    <Input type="number" readOnly className="h-7 w-14 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_YEARS_PRO] || 0} />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr_1fr_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">DOB (M/D/Y)</span>
                                                    <Input
                                                        type="number" min={1} max={12} className="h-8 font-mono text-xs p-1"
                                                        value={profilePlayer.vitals?.[VITAL_BIRTH_MONTH] || 1}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_BIRTH_MONTH, Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)));
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                    <Input
                                                        type="number" min={1} max={31} className="h-8 font-mono text-xs p-1"
                                                        value={profilePlayer.vitals?.[VITAL_BIRTH_DAY] || 1}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_BIRTH_DAY, Math.max(1, Math.min(31, parseInt(e.target.value, 10) || 1)));
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                    <Input
                                                        type="number" min={1900} max={2025} className="h-8 font-mono text-xs p-1"
                                                        value={profilePlayer.vitals?.[VITAL_BIRTH_YEAR] || 1990}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_BIRTH_YEAR, Math.max(1900, Math.min(2025, parseInt(e.target.value, 10) || 1990)));
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-t border-border pt-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Team ID 1</span>
                                                    <Input
                                                        type="number" className="h-8 font-mono text-xs text-right p-1"
                                                        value={profilePlayer.vitals?.[VITAL_TEAM_ID1] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_TEAM_ID1, parseInt(e.target.value, 10) || 0);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Team ID 2</span>
                                                    <Input
                                                        type="number" className="h-8 font-mono text-xs text-right p-1"
                                                        value={profilePlayer.vitals?.[VITAL_TEAM_ID2] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_TEAM_ID2, parseInt(e.target.value, 10) || 0);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Contract & Financials
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                    {[1, 2, 3, 4, 5, 6, 7].map(year => (
                                                        <div key={year} className="space-y-1">
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Year {year} ($)</span>
                                                            <Input
                                                                type="number" className="h-8 font-mono text-xs text-right p-1"
                                                                value={profilePlayer.vitals?.[VITAL_CONTRACT_Y1 + (year - 1)] || 0}
                                                                onChange={(e) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, VITAL_CONTRACT_Y1 + (year - 1), parseInt(e.target.value, 10) || 0);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3 pt-2 border-t border-border pt-2">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Option</span>
                                                    <select
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                        value={profilePlayer.vitals?.[VITAL_CONTRACT_OPT] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_CONTRACT_OPT, parseInt(e.target.value, 10));
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    >
                                                        {Object.entries(CONTRACT_OPT_NAMES).map(([id, name]) => (
                                                            <option key={id} value={id}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex items-center justify-between py-2">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">No-Trade Clause</span>
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                                                        checked={(profilePlayer.vitals?.[VITAL_NO_TRADE] || 0) === 1}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_NO_TRADE, e.target.checked ? 1 : 0);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Health & Status
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Injury Type</span>
                                                    <Input
                                                        type="number" className="h-8 font-mono text-xs text-right p-1"
                                                        value={profilePlayer.vitals?.[VITAL_INJURY_TYPE] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_INJURY_TYPE, parseInt(e.target.value, 10) || 0);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Days Left</span>
                                                    <Input
                                                        type="number" className="h-8 font-mono text-xs text-right p-1"
                                                        value={profilePlayer.vitals?.[VITAL_INJURY_DAYS] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_INJURY_DAYS, parseInt(e.target.value, 10) || 0);
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                Gameplay Archetype
                                            </h3>
                                            <div className="space-y-4 pb-6">
                                                <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                    <span className="text-sm font-medium text-muted-foreground truncate">Play Style</span>
                                                    <select
                                                        className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                        value={profilePlayer.vitals?.[VITAL_PLAY_STYLE] || 0}
                                                        onChange={(e) => {
                                                            if (!engine) return;
                                                            engine.setVitalById(profilePlayer.index, VITAL_PLAY_STYLE, parseInt(e.target.value, 10));
                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                        }}
                                                    >
                                                        {Object.entries(PLAY_STYLE_NAMES).map(([id, name]) => (
                                                            <option key={id} value={id}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {[1, 2, 3, 4].map(num => (
                                                    <div key={num} className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Play Type {num}</span>
                                                        <select
                                                            className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                                            value={profilePlayer.vitals?.[VITAL_PLAY_TYPE1 + (num - 1)] || 0}
                                                            onChange={(e) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_PLAY_TYPE1 + (num - 1), parseInt(e.target.value, 10));
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? engine.getPlayer(p.index) : p));
                                                            }}
                                                        >
                                                            {Object.entries(PLAY_TYPE_NAMES).map(([id, name]) => (
                                                                <option key={id} value={id}>{name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* ---- Tab: All 43 Ratings ---- */}
                                    <TabsContent value="ratings" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                                        {/* Group ratings by category */}
                                        {Object.entries(
                                            RATING_DEFS.reduce<Record<string, typeof RATING_DEFS>>((acc, r) => {
                                                (acc[r.category] ??= []).push(r);
                                                return acc;
                                            }, {})
                                        ).map(([category, defs]) => (
                                            <div key={category}>
                                                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                    {category}
                                                </h3>
                                                <div className="space-y-2 mb-4">
                                                    {defs.map((r) => {
                                                        const val = profilePlayer.ratings[r.id];
                                                        return (
                                                            <div key={r.id} className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                                <span className="text-sm font-medium text-muted-foreground truncate">{r.name}</span>
                                                                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-300 ${val >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                                            : val >= 60 ? 'bg-gradient-to-r from-primary to-primary/70'
                                                                                : 'bg-gradient-to-r from-orange-500 to-amber-400'
                                                                            }`}
                                                                        style={{ width: `${val}%` }}
                                                                    />
                                                                </div>
                                                                <Input
                                                                    type="number"
                                                                    min={25}
                                                                    max={110}
                                                                    className="h-7 w-14 font-mono text-xs text-right p-1"
                                                                    value={val}
                                                                    onChange={(e) => {
                                                                        if (!engine) return;
                                                                        const newVal = Math.max(25, Math.min(110, parseInt(e.target.value, 10) || 25));
                                                                        engine.setRatingById(profilePlayer.index, r.id, newVal);
                                                                        const updated = engine.getPlayer(profilePlayer.index);
                                                                        setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>

                                    {/* ---- Tab: All 58 Tendencies ---- */}
                                    <TabsContent value="tendencies" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                                        {/* Group tendencies by category */}
                                        <Accordion type="multiple" className="w-full">
                                            {Object.entries(
                                                TENDENCY_DEFS.reduce<Record<string, typeof TENDENCY_DEFS>>((acc, t) => {
                                                    (acc[t.category] ??= []).push(t);
                                                    return acc;
                                                }, {})
                                            ).map(([category, defs]) => (
                                                <AccordionItem key={category} value={category}>
                                                    <AccordionTrigger className="text-xs uppercase tracking-wider text-muted-foreground hover:no-underline py-2">
                                                        {category}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="space-y-3 pb-4">
                                                        {defs.map((t) => {
                                                            const rawVal = profilePlayer.tendencies[t.id];
                                                            const displayVal = Math.round((rawVal / 255) * 100);
                                                            return (
                                                                <div key={t.id} className="space-y-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <label className="text-sm font-medium truncate">{t.name}</label>
                                                                        <span className="font-mono text-xs font-bold text-primary min-w-[32px] text-right">
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
                                                                            engine.setTendencyById(profilePlayer.index, t.id, newRaw);
                                                                            const updated = engine.getPlayer(profilePlayer.index);
                                                                            setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                        }}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </TabsContent>

                                    {/* ---- Tab: Hot Zones ---- */}
                                    <TabsContent value="hotzones" className="space-y-4 mt-4">
                                        <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                            Court Hot Zones (14 zones)
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {HOT_ZONE_NAMES.map((name, i) => {
                                                const val = profilePlayer.hotZones[i];
                                                const getHotZoneColor = (v: number) => {
                                                    switch (v) {
                                                        case 0: return 'bg-blue-500/10 text-blue-500 border-blue-500/30'; // Cold
                                                        case 1: return 'bg-background text-foreground border-border'; // Neutral
                                                        case 2: return 'bg-orange-500/10 text-orange-500 border-orange-500/30'; // Hot
                                                        case 3: return 'bg-red-500/10 text-red-500 border-red-500/30'; // Burned
                                                        default: return '';
                                                    }
                                                };
                                                return (
                                                    <div key={i} className={`flex items-center justify-between border rounded-lg px-3 py-2 transition-colors ${getHotZoneColor(val)}`}>
                                                        <span className="text-sm font-medium truncate">{name}</span>
                                                        <Select
                                                            value={val.toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setHotZone(profilePlayer.index, i, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="w-24 h-7 bg-transparent border-0 shadow-none font-mono font-bold text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(HOT_ZONE_VALUES).map(([v, label]) => (
                                                                    <SelectItem key={v} value={v}>{label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TabsContent>

                                    {/* ---- Tab: Animations & Sigs ---- */}
                                    <TabsContent value="animations" className="mt-4">
                                        <ScrollArea className="h-[60vh] pr-4 space-y-6">
                                            {/* Signature Skills */}
                                            <div>
                                                <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                    Signature Skills (5 slots)
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[0, 1, 2, 3, 4].map((slot) => (
                                                        <div key={slot} className="flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2">
                                                            <span className="text-xs font-medium text-muted-foreground">Slot {slot + 1}</span>
                                                            <Select
                                                                value={(profilePlayer.sigSkills[slot] || 0).toString()}
                                                                onValueChange={(v) => {
                                                                    if (!engine) return;
                                                                    const val = Math.max(0, Math.min(63, parseInt(v, 10) || 0));
                                                                    engine.setSigSkill(profilePlayer.index, slot, val);
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            >
                                                                <SelectTrigger className="w-40 h-7 bg-background text-xs font-mono">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {SIG_SKILL_NAMES.map((name, i) => (
                                                                        <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 40 Animations */}
                                            {Object.entries(
                                                ANIMATION_DEFS.reduce<Record<string, typeof ANIMATION_DEFS>>((acc, t) => {
                                                    (acc[t.category] ??= []).push(t);
                                                    return acc;
                                                }, {})
                                            ).map(([category, defs]) => (
                                                <div key={category}>
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        {category}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                                        {defs.map((a) => {
                                                            const val = profilePlayer.animations[a.id];
                                                            return (
                                                                <div key={a.id} className="flex flex-col bg-background/50 border border-border/50 rounded-md p-2 hover:bg-muted/50 transition-colors">
                                                                    <span className="text-[10px] font-semibold text-muted-foreground leading-none mb-1.5 truncate" title={a.name}>
                                                                        {a.name}
                                                                    </span>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-xs text-muted-foreground/50">ID {a.id}</span>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={255}
                                                                            className="h-6 w-16 font-mono text-xs text-right p-1 bg-background"
                                                                            value={val}
                                                                            onChange={(e) => {
                                                                                if (!engine) return;
                                                                                const newVal = Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0));
                                                                                engine.setAnimationById(profilePlayer.index, a.id, newVal);
                                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* ---- Tab: Gear ---- */}
                                    <TabsContent value="gear" className="mt-4">
                                        <ScrollArea className="h-[60vh] pr-4 space-y-6">
                                            {/* 48 Gear Items Grouped by Category */}
                                            {Object.entries(
                                                GEAR_DEFS.reduce<Record<string, typeof GEAR_DEFS>>((acc, g) => {
                                                    (acc[g.category] ??= []).push(g);
                                                    return acc;
                                                }, {})
                                            ).map(([category, defs]) => (
                                                <div key={category}>
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        {category}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                                        {defs.map((g) => {
                                                            const val = profilePlayer.gear[g.id];
                                                            // Fallback max calculations from raw sizes just for UI min/max controls (will clamp in backend anyway)
                                                            // A 1-bit value is max 1. 2-bit is 3. 3-bit is 7. 4-bit is 15. 32-bit is huge.
                                                            const maxVal = g.id >= 39 && g.id <= 42 ? 2147483647 : (1 << ([1, 3, 2, 2, 3, 2, 3, 2, 4, 2, 2, 2, 2, 3, 2, 3, 2, 4, 2, 2, 2, 2, 1, 2, 3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3, 4, 4, 32, 32, 32, 32, 2, 2, 2, 2, 2][g.id])) - 1;

                                                            return (
                                                                <div key={g.id} className="flex flex-col bg-background/50 border border-border/50 rounded-md p-2 hover:bg-muted/50 transition-colors">
                                                                    <span className="text-[10px] font-semibold text-muted-foreground leading-none mb-1.5 truncate" title={g.name}>
                                                                        {g.name}
                                                                    </span>
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-xs text-muted-foreground/50">ID {g.id}</span>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={maxVal}
                                                                            className="h-6 w-20 font-mono text-xs text-right p-1 bg-background"
                                                                            value={val}
                                                                            onChange={(e) => {
                                                                                if (!engine) return;
                                                                                const newVal = Math.max(0, Math.min(maxVal, parseInt(e.target.value, 10) || 0));
                                                                                engine.setGearById(profilePlayer.index, g.id, newVal);
                                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}

                                            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                                                Gear mapping extracted mathematically from base address 129 using 230 bits width.
                                            </p>
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* ---- Tab: Appearance ---- */}
                                    <TabsContent value="appearance" className="mt-4">
                                        <ScrollArea className="h-[60vh] pr-4 space-y-6">
                                            <div>
                                                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                    Body & Build
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Body Type</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_BODY_TYPE] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_BODY_TYPE, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {BODY_TYPE_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Muscle Tone</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_MUSCLE_TONE] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_MUSCLE_TONE, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {MUSCLE_TONE_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Skin Tone (0-7)</span>
                                                        <Slider
                                                            min={0} max={7} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_SKIN_TONE] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_SKIN_TONE, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-12 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_SKIN_TONE] || 0} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                    Hair & Eyes
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Hair Style</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_HAIR_TYPE] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_HAIR_TYPE, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {HAIR_TYPE_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Hair Color</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_HAIR_COLOR] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_HAIR_COLOR, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {HAIR_COLOR_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Eye Color</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_EYE_COLOR] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_EYE_COLOR, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {EYE_COLOR_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Eyebrows</span>
                                                        <Slider
                                                            min={0} max={15} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_EYEBROW] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_EYEBROW, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-12 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_EYEBROW] || 0} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                    Facial Hair
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Fcl. Hair Color</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_FCL_HAIR_CLR] || 0).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_FCL_HAIR_CLR, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {HAIR_COLOR_NAMES.map((name, i) => <SelectItem key={i} value={i.toString()}>{name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    {[
                                                        ['Mustache', VITAL_MUSTACHE, 7],
                                                        ['Beard', VITAL_BEARD, 15],
                                                        ['Goatee', VITAL_GOATEE, 31],
                                                    ].map(([label, id, max]) => (
                                                        <div key={label as string} className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                            <span className="text-sm font-medium text-muted-foreground truncate">{label as string}</span>
                                                            <Slider
                                                                min={0} max={max as number} step={1}
                                                                value={[profilePlayer.vitals?.[id as number] || 0]}
                                                                onValueChange={([val]) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, id as number, val);
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            />
                                                            <Input type="number" readOnly className="h-7 w-12 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[id as number] || 0} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* ---- Tab: Status & Draft (Phase 7) ---- */}
                                    <TabsContent value="status" className="mt-4">
                                        <ScrollArea className="h-[60vh] pr-4 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                                {/* Personality & Style */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        Personality & Style
                                                    </h3>

                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Nickname</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_NICKNAME] ?? 255).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_NICKNAME, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="255">None</SelectItem>
                                                                {NICKNAME_NAMES.map((name, i) => (
                                                                    <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Sec. Position</span>
                                                        <Select
                                                            value={(profilePlayer.vitals?.[VITAL_SEC_POS] ?? 255).toString()}
                                                            onValueChange={(v) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_SEC_POS, parseInt(v, 10));
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="255">None</SelectItem>
                                                                <SelectItem value="0">PG</SelectItem>
                                                                <SelectItem value="1">SG</SelectItem>
                                                                <SelectItem value="2">SF</SelectItem>
                                                                <SelectItem value="3">PF</SelectItem>
                                                                <SelectItem value="4">C</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="flex flex-col gap-3 py-2 border-t border-border mt-2">
                                                        <div className="flex items-center gap-3">
                                                            <Switch
                                                                id="cb-initiator"
                                                                checked={profilePlayer.vitals?.[VITAL_PLAY_INITIATOR] === 1}
                                                                onCheckedChange={(c) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, VITAL_PLAY_INITIATOR, c ? 1 : 0);
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            />
                                                            <label htmlFor="cb-initiator" className="text-sm font-medium text-muted-foreground cursor-pointer">Play Initiator (Point Logic)</label>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Switch
                                                                id="cb-3pt"
                                                                checked={profilePlayer.vitals?.[VITAL_GOES_TO_3PT] === 1}
                                                                onCheckedChange={(c) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, VITAL_GOES_TO_3PT, c ? 1 : 0);
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            />
                                                            <label htmlFor="cb-3pt" className="text-sm font-medium text-muted-foreground cursor-pointer">Goes to 3PT (Offense)</label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Health & Injuries */}
                                                <div className="space-y-4 col-span-1 md:col-span-2 mt-4 pt-4 border-t border-border">
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        Health & Injuries
                                                    </h3>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                                                            <span className="text-sm font-medium text-muted-foreground truncate">Injury Type</span>
                                                            <Select
                                                                value={(profilePlayer.vitals?.[VITAL_INJURY_TYPE] ?? 0).toString()}
                                                                onValueChange={(v) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, VITAL_INJURY_TYPE, parseInt(v, 10));
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {INJURY_TYPE_NAMES.map((name, i) => (
                                                                        <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                            <span className="text-sm font-medium text-muted-foreground truncate">Days Left</span>
                                                            <Slider
                                                                min={0} max={365} step={1}
                                                                value={[profilePlayer.vitals?.[VITAL_INJURY_DAYS] || 0]}
                                                                onValueChange={([val]) => {
                                                                    if (!engine) return;
                                                                    engine.setVitalById(profilePlayer.index, VITAL_INJURY_DAYS, val);
                                                                    const updated = engine.getPlayer(profilePlayer.index);
                                                                    setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                                }}
                                                            />
                                                            <Input type="number" readOnly className="h-7 w-12 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_INJURY_DAYS] || 0} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Draft Information */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        Draft Information
                                                    </h3>

                                                    <div className="grid grid-cols-[120px_1fr_60px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Draft Year</span>
                                                        <Slider
                                                            min={1950} max={2025} step={1}
                                                            value={[(profilePlayer.vitals?.[VITAL_DRAFT_YEAR] || 0) + 1900]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_DRAFT_YEAR, val - 1900);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-14 font-mono text-xs text-right p-1" value={(profilePlayer.vitals?.[VITAL_DRAFT_YEAR] || 0) + 1900} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Round</span>
                                                        <Slider
                                                            min={1} max={2} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_DRAFT_ROUND] || 1]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_DRAFT_ROUND, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_DRAFT_ROUND] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Pick</span>
                                                        <Slider
                                                            min={1} max={60} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_DRAFT_PICK] || 1]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_DRAFT_PICK, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_DRAFT_PICK] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Team ID</span>
                                                        <Slider
                                                            min={0} max={60} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_DRAFT_TEAM] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_DRAFT_TEAM, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_DRAFT_TEAM] || 0} />
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* ---- Tab: Mentality (Phase 8) ---- */}
                                    <TabsContent value="mentality" className="mt-4">
                                        <ScrollArea className="h-[60vh] pr-4 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                                                {/* Career */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        Career Options
                                                    </h3>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Peak Age Start</span>
                                                        <Slider
                                                            min={18} max={45} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_PEAK_AGE_START] || 18]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_PEAK_AGE_START, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_PEAK_AGE_START] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Peak Age End</span>
                                                        <Slider
                                                            min={18} max={45} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_PEAK_AGE_END] || 18]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_PEAK_AGE_END, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_PEAK_AGE_END] || 0} />
                                                    </div>
                                                </div>

                                                {/* Personality */}
                                                <div className="space-y-4">
                                                    <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
                                                        Personality
                                                    </h3>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Potential</span>
                                                        <Slider
                                                            min={25} max={99} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_POTENTIAL] || 25]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_POTENTIAL, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_POTENTIAL] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Loyalty</span>
                                                        <Slider
                                                            min={0} max={100} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_LOYALTY] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_LOYALTY, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_LOYALTY] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Play for Winner</span>
                                                        <Slider
                                                            min={0} max={100} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_PLAY_FOR_WINNER] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_PLAY_FOR_WINNER, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_PLAY_FOR_WINNER] || 0} />
                                                    </div>

                                                    <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                                                        <span className="text-sm font-medium text-muted-foreground truncate">Financial Amb.</span>
                                                        <Slider
                                                            min={0} max={100} step={1}
                                                            value={[profilePlayer.vitals?.[VITAL_FINANCIAL_SECURITY] || 0]}
                                                            onValueChange={([val]) => {
                                                                if (!engine) return;
                                                                engine.setVitalById(profilePlayer.index, VITAL_FINANCIAL_SECURITY, val);
                                                                const updated = engine.getPlayer(profilePlayer.index);
                                                                setPlayers(prev => prev.map(p => p.index === profilePlayer.index ? updated : p));
                                                            }}
                                                        />
                                                        <Input type="number" readOnly className="h-7 w-10 font-mono text-xs text-right p-1" value={profilePlayer.vitals?.[VITAL_FINANCIAL_SECURITY] || 0} />
                                                    </div>
                                                </div>
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                </Tabs>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* ---- Team Edit Sheet (Phase 18) ---- */}
            <Sheet open={teamSheetOpen} onOpenChange={setTeamSheetOpen}>
                <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
                    {selectedTeamIndex !== null && teams[selectedTeamIndex] && (
                        <>
                            <SheetHeader className="pb-6 border-b border-border">
                                <div className="h-12 w-full flex rounded-lg overflow-hidden mb-4 shadow-sm">
                                    <div className="flex-1" style={{ backgroundColor: `#${(teams[selectedTeamIndex].color1 & 0xFFFFFF).toString(16).padStart(6, '0')}` }}></div>
                                    <div className="w-1/3" style={{ backgroundColor: `#${(teams[selectedTeamIndex].color2 & 0xFFFFFF).toString(16).padStart(6, '0')}` }}></div>
                                </div>
                                <SheetTitle className="text-2xl font-black">Edit {teams[selectedTeamIndex].city} {teams[selectedTeamIndex].name}</SheetTitle>
                                <SheetDescription className="font-mono uppercase text-xs">Team Table Index: {selectedTeamIndex} • ID: {teams[selectedTeamIndex].teamId}</SheetDescription>
                            </SheetHeader>

                            <div className="py-6 space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">Basic Identifiers</h3>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground ml-1">City Name</label>
                                        <Input
                                            value={teams[selectedTeamIndex].city}
                                            onChange={(e) => {
                                                if (!engine) return;
                                                engine.setTeamProperty(selectedTeamIndex, 'city', e.target.value);
                                                setTeams(prev => prev.map((t, i) => i === selectedTeamIndex ? engine.getTeam(i) : t));
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground ml-1">Team Name</label>
                                        <Input
                                            value={teams[selectedTeamIndex].name}
                                            onChange={(e) => {
                                                if (!engine) return;
                                                engine.setTeamProperty(selectedTeamIndex, 'name', e.target.value);
                                                setTeams(prev => prev.map((t, i) => i === selectedTeamIndex ? engine.getTeam(i) : t));
                                            }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground ml-1">Abbreviation (4 chars max)</label>
                                        <Input
                                            value={teams[selectedTeamIndex].abbr}
                                            maxLength={4}
                                            className="font-mono uppercase"
                                            onChange={(e) => {
                                                if (!engine) return;
                                                engine.setTeamProperty(selectedTeamIndex, 'abbr', e.target.value.toUpperCase());
                                                setTeams(prev => prev.map((t, i) => i === selectedTeamIndex ? engine.getTeam(i) : t));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">Team Aesthetics</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground ml-1">Primary Color</label>
                                            <div className="flex gap-2">
                                                <div className="w-10 h-10 rounded-lg border border-border shadow-inner shrink-0" style={{ backgroundColor: `#${(teams[selectedTeamIndex].color1 & 0xFFFFFF).toString(16).padStart(6, '0')}` }} />
                                                <Input
                                                    type="text"
                                                    value={`#${(teams[selectedTeamIndex].color1 & 0xFFFFFF).toString(16).padStart(6, '0')}`}
                                                    className="font-mono text-xs"
                                                    onChange={(e) => {
                                                        if (!engine) return;
                                                        const hex = e.target.value.replace(/#/g, '');
                                                        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
                                                            const val = parseInt(hex, 16) | 0xFF000000;
                                                            engine.setTeamProperty(selectedTeamIndex, 'color1', val);
                                                            setTeams(prev => prev.map((t, i) => i === selectedTeamIndex ? engine.getTeam(i) : t));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-muted-foreground ml-1">Secondary Color</label>
                                            <div className="flex gap-2">
                                                <div className="w-10 h-10 rounded-lg border border-border shadow-inner shrink-0" style={{ backgroundColor: `#${(teams[selectedTeamIndex].color2 & 0xFFFFFF).toString(16).padStart(6, '0')}` }} />
                                                <Input
                                                    type="text"
                                                    value={`#${(teams[selectedTeamIndex].color2 & 0xFFFFFF).toString(16).padStart(6, '0')}`}
                                                    className="font-mono text-xs"
                                                    onChange={(e) => {
                                                        if (!engine) return;
                                                        const hex = e.target.value.replace(/#/g, '');
                                                        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
                                                            const val = parseInt(hex, 16) | 0xFF000000;
                                                            engine.setTeamProperty(selectedTeamIndex, 'color2', val);
                                                            setTeams(prev => prev.map((t, i) => i === selectedTeamIndex ? engine.getTeam(i) : t));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic px-1">Colors are stored as ARGB. Enter 6-digit hex values. Alpha is forced to FF.</p>
                                </div>

                                <div className="pt-8 flex flex-col gap-2">
                                    <Button onClick={() => setTeamSheetOpen(false)} className="w-full font-bold">Done</Button>
                                    <p className="text-[10px] text-center text-muted-foreground">Changes are applied immediately to the internal buffer.</p>
                                </div>
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
