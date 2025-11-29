/**
 * Time synchronization provider
 * Synchronizes local time with Snapserver time using periodic TimeMessage exchanges
 */

import {
  buildTimeMessage,
  type Timestamp,
  timestampToMs,
  msToTimestamp,
} from "./message-protocol";

interface TimeSample {
  diff: number; // Server time - client time (ms)
  rtt: number; // Round-trip time (ms)
}

export class TimeProvider {
  private samples: TimeSample[] = [];
  private readonly maxSamples = 100;
  private median = 0;
  private syncInterval: number | null = null;
  private sendCallback: ((message: ArrayBuffer) => void) | null = null;
  private ctx: AudioContext | null = null;
  private pendingRequests = new Map<number, number>();
  private nextId = 1;

  constructor(ctx?: AudioContext) {
    if (ctx) {
      this.setAudioContext(ctx);
    }
  }

  setAudioContext(ctx: AudioContext): void {
    this.ctx = ctx;
    this.reset();
  }

  reset(): void {
    this.samples = [];
    this.median = 0;
  }

  /**
   * Start time synchronization
   */
  start(sendCallback: (message: ArrayBuffer) => void, intervalMs = 1000): void {
    this.sendCallback = sendCallback;
    this.reset();

    // Send initial time message
    this.sendTimeMessage();

    // Set up periodic sync
    this.syncInterval = window.setInterval(() => {
      this.sendTimeMessage();
    }, intervalMs);
  }

  /**
   * Stop time synchronization
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.sendCallback = null;
    this.samples = [];
  }

  /**
   * Send a TimeMessage to the server
   */
  private sendTimeMessage(): void {
    if (!this.sendCallback) return;

    const id = this.nextId++;
    const sentTime = this.now();
    this.pendingRequests.set(id, sentTime);

    const latency = msToTimestamp(sentTime);
    const now = msToTimestamp(sentTime);
    const message = buildTimeMessage(latency, now, id);

    // console.log(
    //   `Sending TimeMessage id=${id}, sentTime=${sentTime.toFixed(2)}`
    // );
    this.sendCallback(message);
  }

  /**
   * Handle TimeMessage response from server
   * Must be called from outside with the message ID, server sent, and server received timestamps
   */
  handleTimeResponse(
    id: number,
    serverSent: Timestamp,
    serverReceived: Timestamp,
    latency: Timestamp
  ): void {
    const clientReceived = this.now();
    const clientSent = this.pendingRequests.get(id);

    if (clientSent === undefined) {
      return;
    }

    this.pendingRequests.delete(id);

    // Calculate time difference using network latencies
    const c2s = timestampToMs(latency);
    const s2c = clientReceived - timestampToMs(serverSent);

    this.setDiff(c2s, s2c);
  }

  /**
   * Set time difference based on client-to-server and server-to-client latencies
   */
  setDiff(c2s: number, s2c: number): void {
    const rtt = Math.abs(c2s + s2c);

    if (rtt > 500) {
      console.warn(
        `Invalid RTT: ${rtt}ms, ignoring sample (c2s: ${c2s}, s2c: ${s2c})`
      );

      return;
    }

    if (this.now() === 0) {
      this.reset();
    } else {
      const newDiff = (c2s - s2c) / 2;
      this.samples.push({ diff: newDiff, rtt });

      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }

      this.updateMedian();
    }
  }

  private updateMedian(): void {
    if (this.samples.length === 0) {
      this.median = 0;
      return;
    }
    const sorted = [...this.samples].sort((a, b) => a.diff - b.diff);
    const midItem = sorted[Math.floor(sorted.length / 2)];
    if (midItem) {
      this.median = midItem.diff;
    }
  }

  /**
   * Get number of sync samples collected
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  now(): number {
    if (!this.ctx) {
      return Date.now();
    }
    // Return AudioContext time in milliseconds (relative to context start)
    const ctx = this.ctx;
    // @ts-ignore
    const contextTime = ctx.getOutputTimestamp
      ? ctx.getOutputTimestamp().contextTime
      : undefined;
    return (contextTime !== undefined ? contextTime : ctx.currentTime) * 1000;
  }

  /**
   * Convert local client time to server time
   * This is how we compare AudioContext playback times with server chunk timestamps
   */
  serverTime(localTimeMs: number): number {
    return localTimeMs + this.median;
  }

  serverNow(): number {
    return this.now() + this.median;
  }

  getDiff(): number {
    return this.median;
  }
}
