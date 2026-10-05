import React from "react";
import { VerificationBatchEvaluation } from "@/domain/traffic-light";

interface GateStripProps {
  evaluation: VerificationBatchEvaluation;
  serverCanApprove: boolean;
  isDirty?: boolean;
}

export function GateStrip({
  evaluation,
  serverCanApprove,
  isDirty = false,
}: GateStripProps) {
  const {
    totalComponents,
    countedComponents,
    uncountedComponents,
    shortCount,
    excessCount,
    canApprove,
    blockers,
  } = evaluation;

  // Determine gate visual state
  const isAllShort = shortCount > 0;
  const isAllCounted = uncountedComponents === 0;
  const isOpen = canApprove; // All counted and 0 short

  let bgClass = "bg-none-bg text-none-fg";
  let barColor = "#7B8793";
  let stateTitle = "Gate closed.";
  let stateSentence = "";
  let rightSideText = "";

  if (countedComponents === 0) {
    // Waiting
    bgClass = "bg-none-bg text-none-fg";
    barColor = "#7B8793";
    stateSentence = "Count every component to open it.";
    rightSideText = `0 of ${totalComponents} counted`;
  } else if (isAllShort) {
    // Blocked
    bgClass = "bg-short-bg text-short-fg";
    barColor = "#B8382D";
    const shortBlockers = blockers.filter((b) => b.reason === "SHORTAGE");
    if (shortBlockers.length === 1) {
      stateSentence = `${shortBlockers[0].message}.`;
      rightSideText = "1 short";
    } else {
      // Find largest short
      const largest = [...shortBlockers].sort(
        (a, b) => (b.expectedQty - (b.actualQty ?? 0)) - (a.expectedQty - (a.actualQty ?? 0))
      )[0];
      const largestShort = largest.expectedQty - (largest.actualQty ?? 0);
      stateSentence = `${shortBlockers.length} components are short. Largest: ${largest.componentName}, ${largestShort}.`;
      rightSideText = `${shortBlockers.length} short`;
    }
  } else if (!isAllCounted) {
    // Counting
    bgClass = "bg-none-bg text-none-fg";
    barColor = "#7B8793";
    stateSentence = `${uncountedComponents} ${
      uncountedComponents === 1 ? "component still needs" : "components still need"
    } a count.`;
    rightSideText = `${countedComponents} of ${totalComponents} counted`;
  } else {
    // Open!
    bgClass = "bg-match-bg text-match-fg";
    barColor = "#2E7D4B";
    stateTitle = "Gate open.";
    stateSentence = `All ${totalComponents} components counted. None short.`;
    rightSideText =
      excessCount > 0
        ? `${excessCount} with excess`
        : "Ready to approve";
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        borderLeft: `6px solid ${barColor}`,
        // V-notch cut into the top-right corner per DESIGN.md: 10px wide, 6px deep
        clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 6px, 100% 100%, 0 100%)",
      }}
      className={`min-h-14 w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-150 rounded-none ${bgClass}`}
    >
      <div className="flex items-center gap-3">
        {/* Custom Gate Glyph (28x28) */}
        {isOpen ? (
          // Open Gate Glyph: raised boom gate
          <svg
            viewBox="0 0 28 28"
            width="28"
            height="28"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="4" y="16" width="3.5" height="9" fill={barColor} rx="0.5" />
            <rect x="20.5" y="16" width="3.5" height="9" fill={barColor} rx="0.5" />
            {/* Raised arm */}
            <path
              d="M5.5 16 L22 6"
              stroke={barColor}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          // Closed Gate Glyph: horizontal arm across two posts
          <svg
            viewBox="0 0 28 28"
            width="28"
            height="28"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="4" y="12" width="3.5" height="13" fill={barColor} rx="0.5" />
            <rect x="20.5" y="12" width="3.5" height="13" fill={barColor} rx="0.5" />
            {/* Closed horizontal arm */}
            <rect x="4" y="14" width="20" height="3.5" fill={barColor} rx="0.5" />
          </svg>
        )}

        <div className="flex flex-wrap items-baseline gap-1.5 text-sm sm:text-base">
          <strong className="font-bold tracking-tight">{stateTitle}</strong>
          <span>{stateSentence}</span>
          {isDirty && isOpen && !serverCanApprove && (
            <span className="text-xs font-semibold text-ink-soft underline decoration-dotted ml-2">
              Save counts to confirm.
            </span>
          )}
        </div>
      </div>

      <div className="text-sm sm:text-base font-bold tabular-nums self-end sm:self-center shrink-0">
        {rightSideText}
      </div>
    </div>
  );
}
