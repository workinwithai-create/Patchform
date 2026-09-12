import { useCallback, useId, useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { cn } from "@/lib/utils";

type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  curve?: "linear" | "log";
  defaultValue: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

function toUnit(value: number, min: number, max: number, curve: "linear" | "log") {
  if (curve === "log") {
    const lo = Math.log(Math.max(min, 0.0001));
    const hi = Math.log(Math.max(max, 0.0001));
    return (Math.log(Math.max(value, 0.0001)) - lo) / (hi - lo);
  }
  return (value - min) / (max - min);
}

function fromUnit(unit: number, min: number, max: number, curve: "linear" | "log") {
  const t = Math.min(1, Math.max(0, unit));
  if (curve === "log") {
    const lo = Math.log(Math.max(min, 0.0001));
    const hi = Math.log(Math.max(max, 0.0001));
    return Math.exp(lo + t * (hi - lo));
  }
  return min + t * (max - min);
}

function snap(value: number, min: number, max: number, step?: number) {
  if (!step) return Math.min(max, Math.max(min, value));
  const snapped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

export function Knob({
  label,
  value,
  min,
  max,
  step,
  curve = "linear",
  defaultValue,
  format,
  onChange,
  disabled,
}: KnobProps) {
  const id = useId();
  const drag = useRef<{ y: number; unit: number } | null>(null);
  const unit = toUnit(value, min, max, curve);
  const angle = -135 + unit * 270;
  const display = format ? format(value) : String(Math.round(value * 100) / 100);

  const commit = useCallback(
    (nextUnit: number) => {
      onChange(snap(fromUnit(nextUnit, min, max, curve), min, max, step));
    },
    [curve, max, min, onChange, step],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, unit };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const fine = event.shiftKey ? 0.0015 : 0.006;
    const delta = (drag.current.y - event.clientY) * fine;
    commit(drag.current.unit + delta);
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.02 : 0.02;
    commit(unit + delta);
  };

  const onDoubleClick = () => {
    if (disabled) return;
    onChange(defaultValue);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const dir =
      event.key === "ArrowUp" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowDown" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!dir) {
      if (event.key === "Home") onChange(min);
      if (event.key === "End") onChange(max);
      return;
    }
    event.preventDefault();
    const amount = event.shiftKey ? 0.02 : 0.05;
    commit(unit + dir * amount);
  };

  return (
    <div className={cn("flex w-16 flex-col items-center gap-1.5", disabled && "opacity-40")}>
      <label htmlFor={id} className="text-micro font-medium uppercase tracking-widest text-faint">
        {label}
      </label>
      <div
        id={id}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(3))}
        aria-disabled={disabled}
        className="relative size-14 touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <svg viewBox="0 0 56 56" className="size-14" aria-hidden="true">
          <circle cx="28" cy="28" r="22" className="fill-surface-2 stroke-border" strokeWidth="1" />
          <circle cx="28" cy="28" r="16.5" className="fill-surface stroke-border-strong" strokeWidth="1" />
          <g transform={`rotate(${angle} 28 28)`}>
            <line
              x1="28"
              y1="12"
              x2="28"
              y2="22"
              className="stroke-accent"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      <span className="font-mono text-2xs tabular-nums text-muted">{display}</span>
    </div>
  );
}
