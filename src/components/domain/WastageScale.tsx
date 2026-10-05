import React from "react";

interface WastageScaleProps {
  actualYds: number;
  expectedYds: number;
  wastagePct: number;
  capPct: number;
}

export function WastageScale({
  actualYds,
  expectedYds,
  wastagePct,
  capPct,
}: WastageScaleProps) {
  const cap = Number(capPct || 0);
  const wastage = Number(wastagePct || 0);
  const act = Number(actualYds || 0);
  const exp = Number(expectedYds || 0);

  const isOverCap = wastage > cap;
  const isNegative = wastage < 0;

  // Scale domain: 0 to max(cap * 2, wastage + 2, 10)
  const maxScale = Math.max(cap * 2, wastage + 2, 10);
  const capPositionPct = Math.min(100, Math.max(0, (cap / maxScale) * 100));
  const fillWidthPct = isNegative
    ? 0
    : Math.min(100, Math.max(0, (wastage / maxScale) * 100));

  // Generate tick marks (every 1 point up to maxScale, max 12 ticks)
  const tickStep = maxScale <= 15 ? 1 : 2;
  const ticks: number[] = [];
  for (let i = 0; i <= maxScale; i += tickStep) {
    ticks.push(i);
  }

  let summaryText = "";
  if (isNegative) {
    summaryText = `Under expected. Expected ${exp.toFixed(2)} yds, used ${act.toFixed(2)} yds.`;
  } else if (isOverCap) {
    summaryText = `Over cap by ${(wastage - cap).toFixed(1)} points. The batch can still pass.`;
  } else {
    summaryText = `Within cap. Expected ${exp.toFixed(2)} yds, used ${act.toFixed(2)} yds.`;
  }

  return (
    <div
      role="meter"
      aria-label="Fabric wastage meter"
      aria-valuenow={wastagePct}
      aria-valuemin={0}
      aria-valuemax={maxScale}
      className="space-y-3 rounded-[2px] border border-rule bg-paper p-4"
    >
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <span className="text-sm font-bold text-ink">
          Fabric wastage
        </span>
        <div className="text-right">
          <span
            className={`font-display text-2xl font-bold tabular-nums ${
              isOverCap ? "text-excess-fg" : "text-ink"
            }`}
          >
            {wastage > 0 ? `+${wastage.toFixed(2)} %` : `${wastage.toFixed(2)} %`}
          </span>
        </div>
      </div>

      {/* Tape Measure Scale */}
      <div className="space-y-1 pt-1">
        {/* Cap pointer */}
        <div className="relative h-4 w-full">
          <div
            style={{ left: `${capPositionPct}%` }}
            className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none"
          >
            <span className="text-[10px] font-bold text-ink-soft whitespace-nowrap">
              ▲ cap {cap.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 8px Track */}
        <div className="relative h-2 w-full bg-rule rounded-none overflow-hidden">
          <div
            style={{ width: `${fillWidthPct}%` }}
            className={`h-full transition-all duration-150 ${
              isOverCap ? "bg-excess-lamp" : "bg-vat"
            }`}
          />
        </div>

        {/* Tick Marks Ruler */}
        <div className="relative flex justify-between text-sm text-ink-soft select-none tabular-nums">
          <span>0</span>
          <span>{Math.round(maxScale / 2)}</span>
          <span>{Math.round(maxScale)}%</span>
        </div>
      </div>

      {/* Status sentence */}
      <div className="text-xs font-medium text-ink pt-1 border-t border-rule flex justify-between items-center">
        <span>{summaryText}</span>
      </div>
    </div>
  );
}
