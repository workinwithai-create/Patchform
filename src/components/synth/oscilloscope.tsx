import { useEffect, useRef } from "react";

type OscilloscopeProps = {
  analyser: AnalyserNode | null;
  live: boolean;
};

function token(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function Oscilloscope({ analyser, live }: OscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ink = token("--color-ink", "#0a0a0c");
    const accent = token("--color-accent", "#6ec9c0");
    const grid = token("--color-grid", "rgba(236,236,232,0.08)");

    let frame = 0;
    const time = new Uint8Array(analyser?.fftSize ?? 2048);

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const { width, height } = canvas;
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 4; i += 1) {
        const y = (height / 4) * i;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (!analyser || !live) {
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (meterRef.current) meterRef.current.style.setProperty("--level", "0");
        return;
      }

      analyser.getByteTimeDomainData(time);
      let sum = 0;
      let trigger = 0;
      for (let i = 1; i < time.length; i += 1) {
        const sample = (time[i]! - 128) / 128;
        sum += sample * sample;
        if (trigger === 0 && time[i - 1]! < 128 && time[i]! >= 128) trigger = i;
      }
      const rms = Math.sqrt(sum / time.length);
      const level = Math.min(1, rms * 3.2);
      if (meterRef.current) meterRef.current.style.setProperty("--level", String(level));

      const start = trigger || 0;
      const windowSize = Math.min(time.length - start, Math.floor(time.length * 0.45));
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < windowSize; i += 1) {
        const x = (i / Math.max(windowSize - 1, 1)) * width;
        const y = (time[start + i]! / 255) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [analyser, live]);

  return (
    <div className="flex min-h-28 min-w-0 flex-1 gap-2">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-ink shadow-border">
        <canvas ref={canvasRef} className="block h-full w-full" />
        {!live ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-micro uppercase tracking-widest text-faint">
            Engine off
          </p>
        ) : null}
      </div>
      <div
        ref={meterRef}
        className="level-meter w-3 shrink-0 overflow-hidden rounded-full bg-ink shadow-border"
        aria-hidden="true"
      >
        <div className="level-fill" />
      </div>
    </div>
  );
}
