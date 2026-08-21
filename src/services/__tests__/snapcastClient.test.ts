import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { createSnapcastClient } from "@/services/snapcastClient";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.CONNECTING;
  onopen: ((e?: any) => void) | null = null;
  onclose: ((e?: any) => void) | null = null;
  onerror: ((e?: any) => void) | null = null;
  onmessage: ((e: any) => void) | null = null;
  sent: any[] = [];
  private listeners = new Set<(e: any) => void>();

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ wasClean: true, code: 1000, reason: "test" });
  }

  addEventListener(type: "message", handler: (e: any) => void) {
    if (type === "message") this.listeners.add(handler);
  }
  removeEventListener(type: "message", handler: (e: any) => void) {
    if (type === "message") this.listeners.delete(handler);
  }

  emit(payload: any) {
    for (const handler of this.listeners) handler({ data: JSON.stringify(payload) });
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  (globalThis as any).WebSocket = FakeWebSocket;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("snapcastClient", () => {
  it("connects, reports status, and sends a request that resolves on matching response id", async () => {
    const client = createSnapcastClient({ url: "ws://test/jsonrpc" });
    const statuses: string[] = [];
    client.onStatusChange((s) => statuses.push(s));

    client.connect();
    expect(statuses).toEqual(["connecting"]);

    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    expect(statuses).toEqual(["connecting", "connected"]);

    const resultPromise = client.request("Server.GetStatus");
    expect(ws.sent[0]).toMatchObject({ id: 1, jsonrpc: "2.0", method: "Server.GetStatus" });

    ws.emit({ id: 1, jsonrpc: "2.0", result: { ok: true } });
    await expect(resultPromise).resolves.toEqual({ ok: true });
  });

  it("rejects the request promise on a JSON-RPC error response", async () => {
    const client = createSnapcastClient({ url: "ws://test/jsonrpc" });
    client.connect();
    FakeWebSocket.instances[0]!.open();

    const resultPromise = client.request("Client.SetVolume", { id: "c1" });
    FakeWebSocket.instances[0]!.emit({
      id: 1,
      jsonrpc: "2.0",
      error: { code: -1, message: "boom" },
    });
    await expect(resultPromise).rejects.toThrow("boom");
  });

  it("rejects the request promise on timeout", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({ url: "ws://test/jsonrpc", requestTimeoutMs: 5000 });
    client.connect();
    FakeWebSocket.instances[0]!.open();

    const resultPromise = client.request("Server.GetStatus");
    const assertion = expect(resultPromise).rejects.toThrow("Request timeout");
    vi.advanceTimersByTime(5001);
    await assertion;
  });

  it("dispatches notifications to onEvent handlers", async () => {
    const client = createSnapcastClient({ url: "ws://test/jsonrpc" });
    const events: any[] = [];
    client.onEvent((msg) => events.push(msg));
    client.connect();
    FakeWebSocket.instances[0]!.open();

    FakeWebSocket.instances[0]!.emit({
      jsonrpc: "2.0",
      method: "Group.OnMute",
      params: { id: "g1", mute: true },
    });
    expect(events).toEqual([
      { jsonrpc: "2.0", method: "Group.OnMute", params: { id: "g1", mute: true } },
    ]);
  });

  it("onEvent unsubscribe stops delivering further notifications", async () => {
    const client = createSnapcastClient({ url: "ws://test/jsonrpc" });
    const events: any[] = [];
    const unsubscribe = client.onEvent((msg) => events.push(msg));
    client.connect();
    FakeWebSocket.instances[0]!.open();
    unsubscribe();

    FakeWebSocket.instances[0]!.emit({ jsonrpc: "2.0", method: "Group.OnMute", params: { id: "g1", mute: true } });
    expect(events).toEqual([]);
  });

  it("reconnects with exponential backoff after an unexpected close, and stops after disconnect()", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({
      url: "ws://test/jsonrpc",
      baseReconnectDelayMs: 1000,
      maxReconnectDelayMs: 30000,
    });
    client.connect();
    FakeWebSocket.instances[0]!.open();
    expect(FakeWebSocket.instances).toHaveLength(1);

    // Unexpected close (server drops the socket) triggers a scheduled reconnect.
    FakeWebSocket.instances[0]!.onclose?.({ wasClean: false, code: 1006, reason: "lost" });
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    client.disconnect();
    FakeWebSocket.instances[1]!.onclose?.({ wasClean: false, code: 1006, reason: "lost" });
    vi.advanceTimersByTime(30000);
    // No further reconnect attempts after a manual disconnect.
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("does not reconnect after a close that happens before the first successful open", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({ url: "ws://test/jsonrpc" });
    client.connect();
    FakeWebSocket.instances[0]!.onclose?.({ wasClean: false, code: 1006, reason: "never opened" });
    vi.advanceTimersByTime(30000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("force-closes a socket stuck in CONNECTING after connectTimeoutMs and reports a timeout error", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({
      url: "ws://test/jsonrpc",
      connectTimeoutMs: 10_000,
    });
    const statuses: Array<{ status: string; error: string | null }> = [];
    client.onStatusChange((status, error) => statuses.push({ status, error }));

    client.connect();
    const ws = FakeWebSocket.instances[0]!;
    expect(ws.readyState).toBe(FakeWebSocket.CONNECTING);

    vi.advanceTimersByTime(10_000);

    expect(client.getStatus()).toBe("disconnected");
    expect(statuses.at(-1)).toEqual({
      status: "disconnected",
      error: "Connection timeout",
    });
    // The stalled socket's own onclose must not have fired and overwritten
    // the timeout message with a generic "Connection lost" one.
    expect(statuses.filter((s) => s.error === "Connection timeout")).toHaveLength(1);

    // This is the client's very first connection attempt — it never
    // succeeded, so (matching the existing pre-first-success policy) no
    // automatic reconnect is scheduled.
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("does not fire the connect timeout once the socket opens successfully", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({
      url: "ws://test/jsonrpc",
      connectTimeoutMs: 10_000,
    });
    client.connect();
    FakeWebSocket.instances[0]!.open();
    expect(client.getStatus()).toBe("connected");

    vi.advanceTimersByTime(10_000);

    // Still connected — the connect timeout was cleared on open and never
    // force-closed the now-legitimate open socket.
    expect(client.getStatus()).toBe("connected");
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("schedules a reconnect when a post-success reconnect attempt itself times out", async () => {
    vi.useFakeTimers();
    const client = createSnapcastClient({
      url: "ws://test/jsonrpc",
      connectTimeoutMs: 10_000,
      baseReconnectDelayMs: 1000,
      maxReconnectDelayMs: 30_000,
    });
    client.connect();
    FakeWebSocket.instances[0]!.open();

    // Unexpected close after a successful connection triggers a reconnect.
    FakeWebSocket.instances[0]!.onclose?.({ wasClean: false, code: 1006, reason: "lost" });
    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // This reconnect attempt stalls and times out.
    vi.advanceTimersByTime(10_000);
    expect(client.getStatus()).toBe("disconnected");

    // Because the client has connected successfully before, the timeout
    // triggers another scheduled reconnect attempt.
    vi.advanceTimersByTime(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });
});
