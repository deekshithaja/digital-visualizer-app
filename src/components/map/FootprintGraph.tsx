import { useMemo, useState } from 'react';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Finding, FootprintTarget, SeverityLevel } from '../../types';

interface FootprintGraphProps {
  ownerName: string;
  targets: FootprintTarget[];
  findings: Finding[];
  selectedFindingId: string | null;
  onSelectFinding: (finding: Finding) => void;
  onSelectTarget: (targetId: string) => void;
}

const SEVERITY_FILL: Record<SeverityLevel, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#0F766E',
};

export function FootprintGraph({
  ownerName,
  targets,
  findings,
  selectedFindingId,
  onSelectFinding,
  onSelectTarget,
}: FootprintGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const width = 920;
  const height = 540;
  const cx = width / 2;
  const cy = height / 2;

  const layout = useMemo(() => {
    const targetNodes = targets.map((t, idx) => {
      const angle = (idx / Math.max(1, targets.length)) * Math.PI * 2 - Math.PI / 2;
      const rx = targets.length <= 2 ? 155 : 165;
      const ry = targets.length <= 2 ? 125 : 135;
      return {
        target: t,
        angle,
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
      };
    });

    const findingNodes: Array<{
      finding: Finding;
      targetId: string;
      x: number;
      y: number;
      tx: number;
      ty: number;
    }> = [];

    for (const tn of targetNodes) {
      const targetFindings = findings.filter((f) => f.targetId === tn.target._id);
      const count = targetFindings.length;
      const spread = Math.min(1.4, Math.max(0.55, count * 0.34));

      targetFindings.forEach((f, i) => {
        const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
        const fAngle = tn.angle + offset;
        const dist = 105 + (i % 2) * 26;
        findingNodes.push({
          finding: f,
          targetId: tn.target._id,
          x: tn.x + Math.cos(fAngle) * dist,
          y: tn.y + Math.sin(fAngle) * dist,
          tx: tn.x,
          ty: tn.y,
        });
      });
    }

    return { targetNodes, findingNodes };
  }, [targets, findings, cx, cy]);

  return (
    <div className="relative rounded-xl border border-[#263653] dark:border-[#263653] bg-[#172641] dark:bg-[#101B32] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#263653] dark:border-[#263653] px-5 py-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-hidden="true" />
            Critical
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-600" aria-hidden="true" />
            High
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-600" aria-hidden="true" />
            Medium
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
            Low / Nominal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
            Resolved
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
            className="rounded-md border border-[#263653] dark:border-[#263653] p-1.5 text-[#A9B7CE] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer"
            aria-label="Zoom out graph"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-11 text-center font-mono text-xs text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.45, +(z + 0.15).toFixed(2)))}
            className="rounded-md border border-[#263653] dark:border-[#263653] p-1.5 text-[#A9B7CE] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer"
            aria-label="Zoom in graph"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setHoveredTargetId(null);
            }}
            className="rounded-md border border-[#263653] dark:border-[#263653] p-1.5 text-[#A9B7CE] dark:text-[#F4F7FF] hover:bg-[#050F20] dark:hover:bg-[#172641] cursor-pointer"
            aria-label="Reset graph view"
            title="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative h-[460px] w-full overflow-auto bg-[#050F20]/70 dark:bg-[#050F20]/60 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full max-w-[920px] select-none transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          role="img"
          aria-label="Digital Footprint Exposure Map"
        >
          {/* Subtle concentric distance rings */}
          <circle
            cx={cx}
            cy={cy}
            r={148}
            fill="none"
            className="stroke-slate-200/80 dark:stroke-slate-800/80"
            strokeDasharray="4 4"
          />
          <circle
            cx={cx}
            cy={cy}
            r={255}
            fill="none"
            className="stroke-slate-200/60 dark:stroke-slate-800/60"
            strokeDasharray="4 4"
          />

          {/* Edges: Core -> Targets */}
          {layout.targetNodes.map((tn) => {
            const dimmed = hoveredTargetId && hoveredTargetId !== tn.target._id;
            return (
              <line
                key={`edge-core-${tn.target._id}`}
                x1={cx}
                y1={cy}
                x2={tn.x}
                y2={tn.y}
                className={
                  dimmed
                    ? 'stroke-slate-200 dark:stroke-slate-800'
                    : 'stroke-slate-300 dark:stroke-slate-700'
                }
                strokeWidth={hoveredTargetId === tn.target._id ? 2.2 : 1.5}
              />
            );
          })}

          {/* Edges: Targets -> Findings */}
          {layout.findingNodes.map((fn) => {
            const dimmed = hoveredTargetId && hoveredTargetId !== fn.targetId;
            const isResolved =
              fn.finding.status === 'resolved' || fn.finding.status === 'false_positive';
            return (
              <line
                key={`edge-f-${fn.finding._id}`}
                x1={fn.tx}
                y1={fn.ty}
                x2={fn.x}
                y2={fn.y}
                stroke={isResolved ? '#16A34A' : SEVERITY_FILL[fn.finding.severity]}
                strokeOpacity={dimmed ? 0.16 : isResolved ? 0.35 : 0.55}
                strokeWidth={selectedFindingId === fn.finding._id ? 2.4 : 1.4}
                strokeDasharray={isResolved ? '3 3' : undefined}
              />
            );
          })}

          {/* Finding Nodes */}
          {layout.findingNodes.map((fn) => {
            const isResolved =
              fn.finding.status === 'resolved' || fn.finding.status === 'false_positive';
            const fill = isResolved ? '#16A34A' : SEVERITY_FILL[fn.finding.severity];
            const isSelected = selectedFindingId === fn.finding._id;
            const dimmed = hoveredTargetId && hoveredTargetId !== fn.targetId;
            const shortTitle =
              fn.finding.title.length > 26
                ? `${fn.finding.title.slice(0, 24)}…`
                : fn.finding.title;

            return (
              <g
                key={fn.finding._id}
                transform={`translate(${fn.x}, ${fn.y})`}
                onClick={() => onSelectFinding(fn.finding)}
                onMouseEnter={() => setHoveredTargetId(fn.targetId)}
                onMouseLeave={() => setHoveredTargetId(null)}
                className="cursor-pointer"
                style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 150ms ease' }}
              >
                {isSelected && (
                  <circle r={17} fill="none" stroke={fill} strokeWidth={2} strokeOpacity={0.5} />
                )}
                <circle
                  r={11}
                  fill={fill}
                  className="stroke-white dark:stroke-slate-900"
                  strokeWidth={2.5}
                />
                <text
                  y={24}
                  textAnchor="middle"
                  className="fill-slate-700 dark:fill-slate-300 text-[10px] font-medium"
                >
                  {shortTitle}
                </text>
              </g>
            );
          })}

          {/* Target Asset Nodes */}
          {layout.targetNodes.map((tn) => {
            const isHovered = hoveredTargetId === tn.target._id;
            return (
              <g
                key={tn.target._id}
                transform={`translate(${tn.x}, ${tn.y})`}
                onClick={() => onSelectTarget(tn.target._id)}
                onMouseEnter={() => setHoveredTargetId(tn.target._id)}
                onMouseLeave={() => setHoveredTargetId(null)}
                className="cursor-pointer"
              >
                <rect
                  x={-54}
                  y={-22}
                  width={108}
                  height={44}
                  rx={10}
                  className={`fill-white dark:fill-slate-900 ${
                    isHovered
                      ? 'stroke-blue-500 dark:stroke-blue-400'
                      : 'stroke-slate-300 dark:stroke-slate-700'
                  }`}
                  strokeWidth={isHovered ? 2 : 1.25}
                />
                <text
                  y={-3}
                  textAnchor="middle"
                  className="fill-slate-900 dark:fill-slate-100 text-[11px] font-semibold"
                >
                  {tn.target.label.length > 15
                    ? `${tn.target.label.slice(0, 14)}…`
                    : tn.target.label}
                </text>
                <text
                  y={12}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  Score {tn.target.healthScore} · {tn.target.findingCounts.total} open
                </text>
              </g>
            );
          })}

          {/* Central Identity Node */}
          <g transform={`translate(${cx}, ${cy})`}>
            <circle
              r={42}
              className="fill-blue-600 dark:fill-blue-500 stroke-white dark:stroke-slate-900"
              strokeWidth={4}
            />
            <text
              y={-3}
              textAnchor="middle"
              className="fill-white text-[12px] font-semibold"
            >
              {ownerName.split(' ')[0] || 'You'}
            </text>
            <text
              y={12}
              textAnchor="middle"
              className="fill-blue-900/40 text-[10px]"
            >
              Identity Core
            </text>
          </g>
        </svg>

        <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-1.5 text-xs text-[#A9B7CE] dark:text-[#A9B7CE]">
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Click any exposure node to inspect plain-English guidance</span>
        </div>
      </div>
    </div>
  );
}
