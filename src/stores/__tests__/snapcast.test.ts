import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSnapcastStore } from "@/stores/snapcast";
import { useAuthStore } from "@/stores/auth";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
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
    queueMicrotask(() => this.onopen?.());
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  (globalThis as any).WebSocket = FakeWebSocket;
  setActivePinia(createPinia());
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("snapcast store — PR 1 network hygiene", () => {
  it("handles Server.OnUpdate instead of polling", async () => {
    const store = useSnapcastStore();
    useAuthStore();
    store.setHost("localhost:1780");
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    expect(ws.sent[0]?.method).toBe("Server.GetStatus");

    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });
    expect(store.groups).toEqual([]);

    ws.emit({
      jsonrpc: "2.0",
      method: "Server.OnUpdate",
      params: {
        server: {
          groups: [
            {
              id: "g1",
              name: "Living",
              stream_id: "",
              muted: false,
              clients: [
                {
                  id: "c1",
                  name: "",
                  host: { name: "h1", ip: "", mac: "", arch: "", os: "" },
                  connected: true,
                  config: { instance: 1, latency: 0, name: "", volume: { muted: false, percent: 50 } },
                  snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
                  lastSeen: { sec: 0, usec: 0 },
                },
              ],
            },
          ],
          streams: [],
          server: {} as any,
        },
      },
    });
    expect(store.groups).toHaveLength(1);
    expect(store.groups[0]?.name).toBe("Living");
    expect(store.allClients).toHaveLength(1);
  });

  it("patches Client.OnConnect/OnDisconnect locally (no getServerStatus triggered)", async () => {
    const store = useSnapcastStore();
    useAuthStore();
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();

    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });

    ws.emit({
      jsonrpc: "2.0",
      method: "Server.OnUpdate",
      params: {
        server: {
          groups: [
            {
              id: "g1",
              name: "Living",
              stream_id: "",
              muted: false,
              clients: [
                {
                  id: "c1",
                  name: "",
                  host: { name: "h1", ip: "", mac: "", arch: "", os: "" },
                  connected: false,
                  config: { instance: 1, latency: 0, name: "", volume: { muted: false, percent: 50 } },
                  snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
                  lastSeen: { sec: 0, usec: 0 },
                },
              ],
            },
          ],
          streams: [],
          server: {} as any,
        },
      },
    });
    const statusCalls = ws.sent.filter((m: any) => m.method === "Server.GetStatus");
    expect(statusCalls).toHaveLength(1);

    ws.emit({
      jsonrpc: "2.0",
      method: "Client.OnConnect",
      params: {
        id: "c1",
        client: {
          id: "c1",
          name: "",
          host: { name: "h1", ip: "", mac: "", arch: "", os: "" },
          connected: true,
          config: { instance: 1, latency: 0, name: "", volume: { muted: false, percent: 50 } },
          snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
          lastSeen: { sec: 0, usec: 0 },
        },
      },
    });
    const statusCallsAfter = ws.sent.filter((m: any) => m.method === "Server.GetStatus");
    expect(statusCallsAfter).toHaveLength(1);
    expect(store.findClientById("c1")?.connected).toBe(true);
  });

  it("does not poll periodically (no heartbeat)", async () => {
    vi.useFakeTimers();
    const store = useSnapcastStore();
    useAuthStore();
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });

    const statusCallsAtStart = ws.sent.filter((m: any) => m.method === "Server.GetStatus").length;
    vi.advanceTimersByTime(120_000);
    const statusCallsLater = ws.sent.filter((m: any) => m.method === "Server.GetStatus").length;
    expect(statusCallsLater).toBe(statusCallsAtStart);
  });

  it("does not retry forever after the first connection attempt fails", async () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = useSnapcastStore();
    useAuthStore();

    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.onerror?.({});
    ws.onclose?.({ wasClean: false, code: 1006, reason: "" });

    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(store.isConnected).toBe(false);
    expect(store.isConnecting).toBe(false);
    errSpy.mockRestore();
  });

  it("keeps reconnecting after a previously working connection drops", async () => {
    vi.useFakeTimers();
    const store = useSnapcastStore();
    useAuthStore();

    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();

    ws.close();
    vi.advanceTimersByTime(1000);

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("processes responses for any id, not just id=1", async () => {
    const store = useSnapcastStore();
    useAuthStore();
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();

    const initialReq = ws.sent.find((m: any) => m.method === "Server.GetStatus")!;
    ws.emit({ id: initialReq.id, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });

    const promise = store.getServerStatus();
    const secondReq = ws.sent[ws.sent.length - 1]!;
    expect(secondReq.id).not.toBe(initialReq.id);
    ws.emit({ id: secondReq.id, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });
    await promise;
  });

  it("refreshes status when an unknown client connects", async () => {
    const store = useSnapcastStore();
    useAuthStore();
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });

    ws.emit({
      jsonrpc: "2.0",
      method: "Client.OnConnect",
      params: {
        id: "brand-new",
        client: {
          id: "brand-new",
          name: "",
          host: { name: "h2", ip: "", mac: "", arch: "", os: "" },
          connected: true,
          config: { instance: 1, latency: 0, name: "", volume: { muted: false, percent: 50 } },
          snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
          lastSeen: { sec: 0, usec: 0 },
        },
      },
    });
    const statusCalls = ws.sent.filter((m: any) => m.method === "Server.GetStatus");
    expect(statusCalls).toHaveLength(2);
  });

  it("disconnects a live client when setHost() changes the host, instead of leaving it retrying the old target", async () => {
    vi.useFakeTimers();
    const store = useSnapcastStore();
    useAuthStore();
    store.setHost("old-host:1780");
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    expect(store.isConnected).toBe(true);

    store.setHost("new-host:1780");

    expect(store.host).toBe("new-host:1780");
    expect(store.isConnected).toBe(false);
    expect(store.isConnecting).toBe(false);

    // Even if the old socket were to report a lost connection, there is no
    // live client left to react to it and schedule a reconnect against the
    // stale (old) host.
    ws.onclose?.({ wasClean: false, code: 1006, reason: "lost" });
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("does not disconnect when setHost() is called with the same host", async () => {
    const store = useSnapcastStore();
    useAuthStore();
    store.setHost("same-host:1780");
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    expect(store.isConnected).toBe(true);

    store.setHost("same-host:1780");

    expect(store.isConnected).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("removes its message listener on request timeout (no leak)", async () => {
    vi.useFakeTimers();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const store = useSnapcastStore();
    useAuthStore();
    store.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();
    ws.emit({ id: 1, jsonrpc: "2.0", result: { server: { groups: [], streams: [], server: {} as any } } });

    const beforeCount = (ws as any).listeners.size;
    store.setClientVolume("missing", 50);
    const afterAdd = (ws as any).listeners.size;
    expect(afterAdd).toBe(beforeCount + 1);

    vi.advanceTimersByTime(10_000);
    const afterTimeout = (ws as any).listeners.size;
    expect(afterTimeout).toBe(afterAdd - 1);
    errSpy.mockRestore();
  });
});

function makeClient(id: string, connected = true) {
  return {
    id,
    name: "",
    host: { name: "h", ip: "", mac: "", arch: "", os: "" },
    connected,
    config: { instance: 1, latency: 0, name: "", volume: { muted: false, percent: 50 } },
    snapclient: { name: "Snapclient", protocolVersion: 2, version: "0.27.0" },
    lastSeen: { sec: 0, usec: 0 },
  };
}

function makeServer(groups: any[]) {
  return { groups, streams: [], server: {} as any };
}

async function connectedStore() {
  const store = useSnapcastStore();
  useAuthStore();
  store.connect();
  const ws = FakeWebSocket.instances[0]!;
  ws.open();
  await Promise.resolve();
  const initialReq = ws.sent.find((m: any) => m.method === "Server.GetStatus")!;
  ws.emit({
    id: initialReq.id,
    jsonrpc: "2.0",
    result: {
      server: makeServer([
        { id: "g1", name: "Living", stream_id: "", muted: false, clients: [makeClient("c1", false)] },
      ]),
    },
  });
  return { store, ws };
}

describe("snapcast store — mutation responses keep state in sync", () => {
  it("applies the server status returned by Server.DeleteClient", async () => {
    const { store, ws } = await connectedStore();
    expect(store.allClients).toHaveLength(1);

    const promise = store.deleteClient("c1");
    const req = ws.sent[ws.sent.length - 1]!;
    expect(req.method).toBe("Server.DeleteClient");
    ws.emit({ id: req.id, jsonrpc: "2.0", result: { server: makeServer([]) } });
    await promise;

    expect(store.groups).toHaveLength(0);
    expect(store.allClients).toHaveLength(0);
  });

  it("treats 'Client not found' as already deleted (no throw) and refreshes", async () => {
    const { store, ws } = await connectedStore();

    const promise = store.deleteClient("ghost");
    const req = ws.sent[ws.sent.length - 1]!;
    ws.emit({ id: req.id, jsonrpc: "2.0", error: { code: -32603, message: "Client not found" } });

    // deleteClient should recover by requesting a fresh status
    await Promise.resolve();
    const refresh = ws.sent[ws.sent.length - 1]!;
    expect(refresh.method).toBe("Server.GetStatus");
    ws.emit({ id: refresh.id, jsonrpc: "2.0", result: { server: makeServer([]) } });

    await expect(promise).resolves.toBeUndefined();
    expect(store.groups).toHaveLength(0);
  });

  it("applies the server status returned by Group.SetClients", async () => {
    const { store, ws } = await connectedStore();

    const promise = store.setGroupClients("g1", []);
    const req = ws.sent[ws.sent.length - 1]!;
    expect(req.method).toBe("Group.SetClients");
    ws.emit({ id: req.id, jsonrpc: "2.0", result: { server: makeServer([]) } });
    await promise;

    expect(store.groups).toHaveLength(0);
  });
});
