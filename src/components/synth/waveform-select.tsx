import { FILTER_TYPES, WAVEFORMS, type FilterType, type Waveform } from "@/lib/synth/types";
import { cn } from "@/lib/utils";

type WaveformSelectProps = {
  waveform: Waveform;
  filterType: FilterType;
  onWaveform: (value: Waveform) => void;
  onFilterType: (value: FilterType) => void;
};

const WAVE_ICON: Record<Waveform, string> = {
  sine: "M2 10 C6 2, 10 18, 14 10 C18 2, 22 18, 26 10",
  triangle: "M2 16 L8 4 L16 16 L24 4",
  sawtooth: "M3 16 L3 4 L23 16",
  square: "M3 16 V4 H13 V16 H23 V4",
};

export function WaveformSelect({
  waveform,
  filterType,
  onWaveform,
  onFilterType,
}: WaveformSelectProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="seg" role="radiogroup" aria-label="Waveform">
        {WAVEFORMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={waveform === item.id}
            className={cn("seg-btn", waveform === item.id && "is-on")}
            onClick={() => onWaveform(item.id)}
          >
            <svg viewBox="0 0 28 20" className="wave-icon" aria-hidden="true">
              <path
                d={WAVE_ICON[item.id]}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="seg" role="radiogroup" aria-label="Filter type">
        {FILTER_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={filterType === item.id}
            className={cn("seg-btn", filterType === item.id && "is-on")}
            onClick={() => onFilterType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
