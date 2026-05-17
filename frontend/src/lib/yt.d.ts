// Type declarations for YouTube IFrame Player API
declare namespace YT {
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    stopVideo(): void;
    destroy(): void;
    loadVideoById(videoId: string): void;
    getCurrentTime(): number;
    getDuration(): number;
  }
  interface PlayerEvent {
    target: Player;
  }
  interface OnStateChangeEvent {
    data: number;
    target: Player;
  }
  interface PlayerOptions {
    width?: string | number;
    height?: string | number;
    videoId?: string;
    playerVars?: Record<string, unknown>;
    events?: {
      onReady?: (e: PlayerEvent) => void;
      onStateChange?: (e: OnStateChangeEvent) => void;
      onError?: (e: { data: number }) => void;
    };
  }
  const PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}
