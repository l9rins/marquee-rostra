// ============================================================================
// RadarChart.tsx — Animated SVG Radar Chart for Player Attributes
// ============================================================================
// Accepts a PlayerData object and renders a 5-axis radar visualization.
// Zero external dependencies. Uses CSS custom properties for theming.
// ============================================================================

import type { PlayerData } from '../engine/RosterEngine';

// ---- Chart Configuration ---------------------------------------------------

interface AxisConfig {
    label: string;
    key: keyof PlayerData;
    icon: string;
}

const AXES: AxisConfig[] = [
    { label: 'Outside', key: 'threePointRating', icon: '🎯' },
    { label: 'Mid-Range', key: 'midRangeRating', icon: '🏀' },
    { label: 'Athleticism', key: 'speedRating', icon: '⚡' },
    { label: 'Inside', key: 'dunkRating', icon: '💪' },
    { label: 'Overall', key: 'overallRating', icon: '⭐' },
];

const MIN_RATING = 25;
const MAX_RATING = 99;

// ---- Component -------------------------------------------------------------

interface RadarChartProps {
    player: PlayerData;
    size?: number;
}

export const RadarChart: React.FC<RadarChartProps> = ({ player, size = 280 }) => {
    const center = size / 2;
    const radius = (size / 2) * 0.72;
    const n = AXES.length;
    const angleStep = (Math.PI * 2) / n;

    // Normalize a rating to 0–1 range
    const normalize = (val: number) =>
        Math.max(0, Math.min(1, (val - MIN_RATING) / (MAX_RATING - MIN_RATING)));

    // Convert polar to cartesian, offset by -90° so first axis points up
    const polar = (angle: number, r: number) => ({
        x: center + r * Math.cos(angle - Math.PI / 2),
        y: center + r * Math.sin(angle - Math.PI / 2),
    });

    // Generate the data polygon points
    const dataPoints = AXES.map((axis, i) => {
        const value = player[axis.key] as number;
        const r = normalize(value) * radius;
        return polar(i * angleStep, r);
    });
    const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // Background level polygons
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // Unique gradient ID
    const gradientId = `radar-gradient-${Math.random().toString(36).slice(2, 8)}`;
    const glowId = `radar-glow-${Math.random().toString(36).slice(2, 8)}`;

    return (
        <div className="radar-chart-container" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    {/* Gradient fill for the data shape */}
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255, 152, 0, 0.35)" />
                        <stop offset="100%" stopColor="rgba(245, 124, 0, 0.10)" />
                    </linearGradient>
                    {/* Glow filter for data points */}
                    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Background level rings */}
                {levels.map((level, li) => {
                    const pts = Array.from({ length: n }, (_, i) => {
                        const p = polar(i * angleStep, level * radius);
                        return `${p.x},${p.y}`;
                    }).join(' ');
                    return (
                        <polygon
                            key={li}
                            points={pts}
                            fill="none"
                            stroke="var(--border-subtle)"
                            strokeWidth={li === levels.length - 1 ? '1.5' : '0.8'}
                            opacity={0.5 + li * 0.1}
                        />
                    );
                })}

                {/* Axis spokes + labels */}
                {AXES.map((axis, i) => {
                    const end = polar(i * angleStep, radius);
                    const labelPos = polar(i * angleStep, radius + 28);
                    const value = player[axis.key] as number;
                    return (
                        <g key={i}>
                            <line
                                x1={center} y1={center}
                                x2={end.x} y2={end.y}
                                stroke="var(--border-subtle)"
                                strokeWidth="0.8"
                                strokeDasharray="3,3"
                                opacity="0.6"
                            />
                            <text
                                x={labelPos.x} y={labelPos.y - 7}
                                textAnchor="middle"
                                dominantBaseline="auto"
                                fill="var(--text-muted)"
                                fontSize="9"
                                fontWeight="600"
                                fontFamily="var(--font-sans)"
                                letterSpacing="0.03em"
                            >
                                {axis.label.toUpperCase()}
                            </text>
                            <text
                                x={labelPos.x} y={labelPos.y + 7}
                                textAnchor="middle"
                                dominantBaseline="auto"
                                fill="var(--accent-primary)"
                                fontSize="12"
                                fontWeight="800"
                                fontFamily="var(--font-mono)"
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}

                {/* Data shape — filled polygon */}
                <path
                    d={dataPath}
                    fill={`url(#${gradientId})`}
                    stroke="var(--accent-primary)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    className="radar-data-path"
                />

                {/* Data points with glow */}
                {dataPoints.map((p, i) => (
                    <g key={i} filter={`url(#${glowId})`}>
                        <circle
                            cx={p.x} cy={p.y} r="4.5"
                            fill="var(--accent-primary)"
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                        />
                    </g>
                ))}

                {/* Center dot */}
                <circle
                    cx={center} cy={center} r="2"
                    fill="var(--text-muted)"
                    opacity="0.3"
                />
            </svg>
        </div>
    );
};
