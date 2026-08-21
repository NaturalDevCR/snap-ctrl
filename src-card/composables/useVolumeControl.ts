export interface UseVolumeControlOptions {
  request: <T = unknown>(
    method: string,
    params?: Record<string, unknown>
  ) => Promise<T>;
  debounceMs?: number;
}

export interface VolumeControl {
  setVolume(
    clientId: string,
    percent: number,
    currentMuted: boolean,
    onOptimistic: (percent: number) => void,
    onRevert: (percent: number) => void
  ): void;
  setMute(
    clientId: string,
    muted: boolean,
    currentPercent: number,
    onOptimistic: (muted: boolean) => void,
    onRevert: (muted: boolean) => void
  ): Promise<void>;
}

export function useVolumeControl(
  options: UseVolumeControlOptions
): VolumeControl {
  const debounceMs = options.debounceMs ?? 80;
  const pending = new Map<string, ReturnType<typeof setTimeout>>();

  function setVolume(
    clientId: string,
    percent: number,
    currentMuted: boolean,
    onOptimistic: (percent: number) => void,
    onRevert: (percent: number) => void
  ) {
    onOptimistic(percent);

    const existing = pending.get(clientId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      pending.delete(clientId);
      options
        .request("Client.SetVolume", {
          id: clientId,
          volume: { percent, muted: currentMuted },
        })
        .catch(() => onRevert(percent));
    }, debounceMs);

    pending.set(clientId, timer);
  }

  async function setMute(
    clientId: string,
    muted: boolean,
    currentPercent: number,
    onOptimistic: (muted: boolean) => void,
    onRevert: (muted: boolean) => void
  ) {
    onOptimistic(muted);
    try {
      await options.request("Client.SetVolume", {
        id: clientId,
        volume: { percent: currentPercent, muted },
      });
    } catch {
      onRevert(!muted);
    }
  }

  return { setVolume, setMute };
}
