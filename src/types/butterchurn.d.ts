declare module 'butterchurn' {
  interface Visualizer {
    connectAudio(audioNode: AudioNode): void;
    loadPreset(preset: unknown, blendTime: number): void;
    render(): void;
    setRendererSize(width: number, height: number): void;
  }
  interface CreateOptions {
    width: number;
    height: number;
    pixelRatio?: number;
  }
  function createVisualizer(ctx: AudioContext, canvas: HTMLCanvasElement, opts: CreateOptions): Visualizer;
  export default { createVisualizer };
}

declare module 'butterchurn-presets' {
  function getPresets(): Record<string, unknown>;
  export default { getPresets };
}
