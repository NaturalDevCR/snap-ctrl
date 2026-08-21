import { beforeEach, describe, expect, it } from "vitest";
import { useCardConnection } from "@/../src-card/composables/useCardConnection";

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
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

const baseGroup = {
  id: "g1",
  name: "Living",
  stream_id: "",
  muted: false,
  clients: [
    {
      id: "c1",
      name: "Speaker",
      host: { name: "h1", ip: "", mac: "", arch: "", os: "" },
      connected: true,
      config: { instance: 1, latency: 0, name: "Speaker", volume: { muted: false, percent: 50 } },
      snapclient: { name: "Snapclient", version: "0.27.0", protocolVersion: 2 },
      lastSeen: { sec: 0, usec: 0 },
    },
  ],
};

beforeEach(() => {
  FakeWebSocket.instances = [];
  (globalThis as any).WebSocket = FakeWebSocket;
});

describe("useCardConnection", () => {
  it("connects to ws://<host>:<port>/jsonrpc and populates groups from Server.GetStatus", async () => {
    const conn = useCardConnection({ host: "192.168.1.50", port: 1780 });
    conn.connect();
    expect(conn.status.value).toBe("connecting");

    const ws = FakeWebSocket.instances[0]!;
    expect(ws.url).toBe("ws://192.168.1.50:1780/jsonrpc");
    ws.open();
    await Promise.resolve();

    expect(ws.sent[0]?.method).toBe("Server.GetStatus");
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [baseGroup], streams: [], server: {} } } });

    await Promise.resolve();

    expect(conn.status.value).toBe("connected");
    expect(conn.groups.value).toHaveLength(1);
    expect(conn.groups.value[0]!.name).toBe("Living");
  });

  it("patches volume in place on Client.OnVolumeChanged", async () => {
    const conn = useCardConnection({ host: "h", port: 1780 });
    conn.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [baseGroup], streams: [], server: {} } } });

    await Promise.resolve();

    ws.emit({
      jsonrpc: "2.0",
      method: "Client.OnVolumeChanged",
      params: { id: "c1", volume: { muted: true, percent: 10 } },
    });

    expect(conn.groups.value[0]!.clients[0]!.config.volume).toEqual({ muted: true, percent: 10 });
  });

  it("patches mute in place on Group.OnMute", async () => {
    const conn = useCardConnection({ host: "h", port: 1780 });
    conn.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [baseGroup], streams: [], server: {} } } });

    await Promise.resolve();

    ws.emit({ jsonrpc: "2.0", method: "Group.OnMute", params: { id: "g1", mute: true } });
    expect(conn.groups.value[0]!.muted).toBe(true);
  });

  it("uses wss:// instead of ws:// when the dashboard page is served over https", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, protocol: "https:" },
      writable: true,
      configurable: true,
    });
    try {
      const conn = useCardConnection({ host: "192.168.1.50", port: 1780 });
      conn.connect();
      expect(FakeWebSocket.instances[0]!.url).toBe("wss://192.168.1.50:1780/jsonrpc");
    } finally {
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    }
  });

  it("retry() reconnects after an error", async () => {
    const conn = useCardConnection({ host: "h", port: 1780 });
    conn.connect();
    FakeWebSocket.instances[0]!.onerror?.(new Event("error"));
    expect(conn.status.value).toBe("disconnected");

    conn.retry();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
