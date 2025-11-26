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
  private lastSync = 0;
  private sendCallback: ((message: ArrayBuffer) => void) | null = null;

  /**
   * Start time synchronization
   * @param sendCallback Function to send TimeMessage to server
   * @param intervalMs Sync interval in milliseconds (default 1000ms)
   */
  start(sendCallback: (message: ArrayBuffer) => void, intervalMs = 1000): void {
    this.sendCallback = sendCallback;
    this.samples = [];
    this.median = 0;

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

    this.lastSync = Date.now();
    const latency = msToTimestamp(0); // Will be filled by server
    const message = buildTimeMessage(latency);
    this.sendCallback(message);
  }

  /**
   * Handle TimeMessage response from server
   * @param sent Timestamp when message was sent
   * @param received Timestamp when server received it
   */
  handleTimeMessage(sent: Timestamp, received: Timestamp): void {
    const now = Date.now();
    const sentMs = timestampToMs(sent);
    const receivedMs = timestampToMs(received);

    // Calculate round-trip time
    const rtt = now - sentMs;

    if (rtt < 0 || rtt > 5000) {
      // Ignore invalid samples (negative or > 5 seconds)
      console.warn(`Invalid RTT: ${rtt}ms, ignoring sample`);
      return;
    }

    // Estimate one-way latency
    const oneWayLatency = rtt / 2;

    // Calculate server time when it received our message
    // Server received it at 'receivedMs', which was 'oneWayLatency' ago
    const estimatedServerNow = receivedMs + oneWayLatency;

    // Calculate difference: server time - client time
    const diff = estimatedServerNow - now;

    // Add sample
    this.samples.push({ diff, rtt });

    // Keep only the last maxSamples
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }

    // Calculate median of differences
    this.updateMedian();
  }

  /**
   * Update the median difference from samples
   */
  private updateMedian(): void {
    if (this.samples.length === 0) {
      this.median = 0;
      return;
    }

    // Sort by diff
    const sorted = [...this.samples].sort((a, b) => a.diff - b.diff);

    // Calculate median
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      const left = sorted[mid - 1];
      const right = sorted[mid];
      this.median = left && right ? (left.diff + right.diff) / 2 : 0;
    } else {
      this.median = sorted[mid]?.diff ?? 0;
    }
  }

  /**
   * Get current server time in milliseconds
   */
  now(): number {
    return Date.now() + this.median;
  }

  /**
   * Get current server time as Timestamp
   */
  nowTimestamp(): Timestamp | null {
    return msToTimestamp(this.now());
  }

  /**
   * Get the current time difference (server - client) in ms
   */
  getDiff(): number {
    return this.median;
  }

  /**
   * Get average RTT from recent samples
   */
  getAverageRtt(): number {
    if (this.samples.length === 0) return 0;

    const sum = this.samples.reduce((acc, s) => acc + s.rtt, 0);
    return sum / this.samples.length;
  }

  /**
   * Get number of sync samples collected
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Check if time sync is ready (has enough samples)
   */
  isReady(): boolean {
    return this.samples.length >= 10;
  }
}
