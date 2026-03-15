import { useEffect, useRef } from 'react';
import butterchurn from 'butterchurn';
import butterchurnPresets from 'butterchurn-presets';
import { buildStreamUrl } from '../api/subsonic';
import { usePlayerStore } from '../store/playerStore';

interface Props {
  trackId: string;
  nextPresetTrigger: number;
  onPresetName: (name: string) => void;
}

export default function VisualizerCanvas({ trackId, nextPresetTrigger, onPresetName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vizRef = useRef<ReturnType<typeof butterchurn.createVisualizer> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const presetNamesRef = useRef<string[]>([]);
  const presetMapRef = useRef<Record<string, unknown>>({});
  const presetIdxRef = useRef(0);

  // ── Init audio analysis + butterchurn ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Hidden audio element — routed through Web Audio for analysis only.
    // NOT connected to AudioDestinationNode → completely silent.
    // The Rust/rodio engine plays the actual audio.
    const streamUrl = buildStreamUrl(trackId);
    const audio = new Audio(streamUrl);
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaElementSource(audio);
    // Intentionally no: source.connect(ctx.destination)

    // Size canvas to fill its container
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);

    const visualizer = butterchurn.createVisualizer(ctx, canvas, {
      width: canvas.width,
      height: canvas.height,
      pixelRatio: window.devicePixelRatio || 1,
    });
    vizRef.current = visualizer;
    visualizer.connectAudio(source);

    // Presets
    const presets = butterchurnPresets.getPresets();
    const names = Object.keys(presets);
    presetNamesRef.current = names;
    presetMapRef.current = presets;
    const startIdx = Math.floor(Math.random() * names.length);
    presetIdxRef.current = startIdx;
    visualizer.loadPreset(presets[names[startIdx]], 2.0);
    onPresetName(names[startIdx]);

    // Sync position + play state with main player
    const { currentTime, isPlaying } = usePlayerStore.getState();
    audio.currentTime = currentTime;
    if (isPlaying) audio.play().catch(() => {});

    // Render loop
    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      visualizer.render();
    };
    rafRef.current = requestAnimationFrame(render);

    // Keep canvas sized to window
    const onResize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      visualizer.setRendererSize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);

    // Sync play/pause with main player
    const unsubscribe = usePlayerStore.subscribe(state => {
      const a = audioRef.current;
      const c = audioCtxRef.current;
      if (!a || !c) return;
      if (state.isPlaying) {
        c.resume();
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      unsubscribe();
      audio.pause();
      audio.src = '';
      ctx.close();
      vizRef.current = null;
    };
  }, [trackId]); // re-init on track change

  // ── Next preset ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!nextPresetTrigger) return;
    const viz = vizRef.current;
    const names = presetNamesRef.current;
    if (!viz || names.length === 0) return;
    const next = (presetIdxRef.current + 1) % names.length;
    presetIdxRef.current = next;
    viz.loadPreset(presetMapRef.current[names[next]], 2.0);
    onPresetName(names[next]);
  }, [nextPresetTrigger]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}
