import { useCallback, useRef, type PointerEvent } from "react";
import { INTERVAL_HINT, isBlackKey, midiToName } from "@/lib/synth/notes";
import { cn } from "@/lib/utils";

type KeyboardProps = {
  startMidi: number;
  octaves?: number;
  held: number[];
  onDown: (midi: number) => void;
  onUp: (midi: number) => void;
  disabled?: boolean;
};

export function Keyboard({
  startMidi,
  octaves = 2,
  held,
  onDown,
  onUp,
  disabled,
}: KeyboardProps) {
  const endMidi = startMidi + octaves * 12;
  const whites: number[] = [];
  const blacks: number[] = [];
  for (let midi = startMidi; midi <= endMidi; midi += 1) {
    if (isBlackKey(midi)) blacks.push(midi);
    else whites.push(midi);
  }

  const heldSet = new Set(held);
  const pointers = useRef(new Map<number, number>());
  const bed = useRef<HTMLDivElement>(null);
  const onDownRef = useRef(onDown);
  const onUpRef = useRef(onUp);
  onDownRef.current = onDown;
  onUpRef.current = onUp;

  const hitTest = useCallback((clientX: number, clientY: number): number | null => {
    const root = bed.current;
    if (!root) return null;
    const blackEls = root.querySelectorAll<HTMLElement>("[data-black='1']");
    for (const el of blackEls) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return Number(el.dataset.midi);
      }
    }
    const whiteEls = root.querySelectorAll<HTMLElement>("[data-black='0']");
    for (const el of whiteEls) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return Number(el.dataset.midi);
      }
    }
    return null;
  }, []);

  const startPointer = (pointerId: number, midi: number) => {
    if (disabled) return;
    try {
      bed.current?.setPointerCapture(pointerId);
    } catch {
      /* synthetic events may not capture */
    }
    const prev = pointers.current.get(pointerId);
    if (prev === midi) return;
    if (prev !== undefined) onUpRef.current(prev);
    pointers.current.set(pointerId, midi);
    onDownRef.current(midi);
  };

  const onKeyPointerDown = (midi: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    startPointer(event.pointerId, midi);
  };

  const onBedPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const midi = hitTest(event.clientX, event.clientY);
    if (midi === null) return;
    event.preventDefault();
    startPointer(event.pointerId, midi);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const midi = hitTest(event.clientX, event.clientY);
    if (midi === null) return;
    startPointer(event.pointerId, midi);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(event.pointerId);
    pointers.current.delete(event.pointerId);
    if (prev !== undefined) onUpRef.current(prev);
  };

  return (
    <div
      ref={bed}
      className="keybed relative isolate flex h-32 w-full touch-none select-none md:h-44"
      onPointerDown={onBedPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="Piano keyboard"
    >
      {whites.map((midi) => {
        const interval = midi - startMidi;
        const hint = INTERVAL_HINT[interval];
        const on = heldSet.has(midi);
        const name = midiToName(midi);
        const showName = name.startsWith("C") && !name.includes("#");
        return (
          <button
            key={midi}
            type="button"
            data-midi={midi}
            data-black="0"
            tabIndex={-1}
            aria-label={name}
            aria-pressed={on}
            className={cn("key-white", on && "is-on")}
            onPointerDown={onKeyPointerDown(midi)}
          >
            {hint ? <span className="key-hint">{hint}</span> : <span />}
            <span className="key-name">{showName ? name : ""}</span>
          </button>
        );
      })}
      {blacks.map((midi) => {
        const whitesBefore = whites.filter((w) => w < midi).length;
        const left = ((whitesBefore - 0.34) / whites.length) * 100;
        const width = (0.58 / whites.length) * 100;
        const interval = midi - startMidi;
        const hint = INTERVAL_HINT[interval];
        const on = heldSet.has(midi);
        return (
          <button
            key={midi}
            type="button"
            data-midi={midi}
            data-black="1"
            tabIndex={-1}
            aria-label={midiToName(midi)}
            aria-pressed={on}
            className={cn("key-black", on && "is-on")}
            style={{ left: `${left}%`, width: `${width}%` }}
            onPointerDown={onKeyPointerDown(midi)}
          >
            {hint ? <span className="key-hint key-hint-black">{hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
