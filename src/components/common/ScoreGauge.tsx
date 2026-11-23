interface ScoreGaugeProps {
  score: number;
  postureLabel: string;
  size?: number;
}

export function ScoreGauge({ score, postureLabel, size = 180 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcFraction = 0.75; // 270 degree gauge
  const totalArc = circumference * arcFraction;
  const filledArc = totalArc * (clamped / 100);

  let strokeColor = '#0F766E';
  let textColor = 'text-blue-600 dark:text-blue-300';
  if (clamped < 50) {
    strokeColor = '#DC2626';
    textColor = 'text-red-600 dark:text-red-400';
  } else if (clamped < 72) {
    strokeColor = '#D97706';
    textColor = 'text-amber-600 dark:text-amber-400';
  } else if (clamped >= 86) {
    strokeColor = '#16A34A';
    textColor = 'text-emerald-700 dark:text-emerald-400';
  }

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
          role="img"
          aria-label={`Privacy Health Score ${clamped} out of 100`}
        >
          <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth={strokeWidth}
              strokeDasharray={`${totalArc} ${circumference}`}
              strokeLinecap="round"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={`${filledArc} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className={`font-display text-4xl font-bold tracking-tight tabular-nums ${textColor}`}>
            {clamped}
          </span>
          <span className="text-xs font-medium text-[#A9B7CE] dark:text-[#A9B7CE] tabular-nums">
            out of 100
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#F4F7FF] dark:text-slate-200">{postureLabel}</p>
    </div>
  );
}
