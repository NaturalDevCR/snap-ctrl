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

    // Use AudioContext/performance time like snapweb
    // The diff will convert between client relative time and server absolute time
    const id = this.nextId++;
    const sentTime = this.now();
    this.pendingRequests.set(id, sentTime);

    // Send latency as current time (snapweb does this)
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

    // Snapweb logic:
    // c2s = latency (what client sent as 'latency', which was timeProvider.now())
    // s2c = now - serverSent (current client time - server's sent time)
    // The diff converts client relative time <-> server absolute time
    const c2s = timestampToMs(latency);
    const s2c = clientReceived - timestampToMs(serverSent);

    this.setDiff(c2s, s2c);
  }

  // Map of ID -> Sent Time (ms)
  // private pendingRequests = new Map<number, number>();
  // private nextId = 0;

  // getNextId(): number {
  //   return this.nextId++ % 65536;
  // }

  // recordRequest(id: number): void {
  //   this.pendingRequests.set(id, this.now());
  // }

  /**
   * Set time difference based on client-to-server and server-to-client latencies
   * Logic from Snapweb
   */
  setDiff(c2s: number, s2c: number): void {
    // c2s = ServerReceived - ClientSent (approx diff)
    // s2c = ClientReceived - ServerSent (approx -diff)
    // RTT = (ClientReceived - ClientSent) - (ServerReceived - ServerSent)
    //     = (ClientReceived - ServerSent) + (ServerReceived - ClientSent)
    //     = s2c + c2s
    const rtt = Math.abs(c2s + s2c);

    if (rtt > 500) {
      console.warn(
        `Invalid RTT: ${rtt}ms, ignoring sample (c2s: ${c2s}, s2c: ${s2c})`
      );
      // Don't reset on single bad RTT, just ignore
      return;
    }

    if (this.now() === 0) {
      this.reset();
    } else {
      // diff = (c2s - s2c) / 2
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
    // AudioContext.currentTime is in seconds, convert to ms
    // getOutputTimestamp().contextTime is also in seconds
    // We need to return a value comparable to Date.now() (wall clock)
    // BUT aligned with AudioContext's timeline?
    // No, snapweb returns: (contextTime !== undefined ? contextTime : ctx.currentTime) * 1000;
    // This is a relative time (from context start), not wall clock.
    // So 'diff' will map Server Wall Clock -> Client Audio Context Time.

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
