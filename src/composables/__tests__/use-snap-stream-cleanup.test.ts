import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useSnapcastStore } from "@/stores/snapcast";
import { useAuthStore } from "@/stores/auth";
import { useSnapStream } from "@/composables/useSnapStream";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  readyState = FakeWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: ((e?: any) => void) | null = null;
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
    const event = { data: JSON.stringify(payload) };
    for (const handler of this.listeners) handler(event);
    this.onmessage?.(event);
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

function getLatestDeleteRequest(ws: FakeWebSocket): any {
  const requests = ws.sent.filter(
    (m: any) => m.method === "Server.DeleteClient"
  );
  return requests[requests.length - 1];
}

async function waitForDeleteRequest(ws: FakeWebSocket): Promise<any> {
  for (let i = 0; i < 10; i++) {
    const req = getLatestDeleteRequest(ws);
    if (req) return req;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return getLatestDeleteRequest(ws);
}

describe("useSnapStream cleanup", () => {
  it("keeps the browser client id and queues cleanup when control websocket is unavailable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stream = useSnapStream();
    const id = stream.clientId.value;

    const cleaned = await stream.disconnect();

    expect(cleaned).toBe(false);
    expect(stream.clientId.value).toBe(id);
    expect(localStorage.getItem("snapcast-client-id")).toBe(id);
    expect(
      JSON.parse(localStorage.getItem("snapcast-pending-client-cleanup") || "[]")
    ).toEqual([id]);

    warnSpy.mockRestore();
  });

  it("retries pending browser client cleanup once Snapcast control is connected", async () => {
    useAuthStore();
    const snapcast = useSnapcastStore();
    snapcast.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();

    // Respond to the auto-sent Server.GetStatus so it doesn't linger
    const statusReq = ws.sent.find((m: any) => m.method === "Server.GetStatus");
    if (statusReq) {
      ws.emit({ id: statusReq.id, jsonrpc: "2.0", result: { server: { groups: [], streams: [] } } });
    }

    const stream = useSnapStream();
    const id = stream.clientId.value;
    localStorage.setItem("snapcast-pending-client-cleanup", JSON.stringify([id]));

    const cleanupPromise = stream.retryPendingClientCleanups(true);
    const deleteRequest = await waitForDeleteRequest(ws);
    expect(deleteRequest?.params).toEqual({ id });

    ws.emit({
      id: deleteRequest.id,
      jsonrpc: "2.0",
      result: {},
    });
    await cleanupPromise;

    expect(localStorage.getItem("snapcast-pending-client-cleanup")).toBeNull();
  });

  it("drops non-retryable cleanup failures immediately", async () => {
    useAuthStore();
    const snapcast = useSnapcastStore();
    snapcast.connect();
    const ws = FakeWebSocket.instances[0]!;
    ws.open();
    await Promise.resolve();

    // Respond to the auto-sent Server.GetStatus
    const statusReq = ws.sent.find((m: any) => m.method === "Server.GetStatus");
    if (statusReq) {
      ws.emit({ id: statusReq.id, jsonrpc: "2.0", result: { server: { groups: [], streams: [] } } });
    }

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const stream = useSnapStream();
    const id = stream.clientId.value;
    localStorage.setItem("snapcast-pending-client-cleanup", JSON.stringify([id]));

    const cleanupPromise = stream.retryPendingClientCleanups(true);
    const deleteRequest = await waitForDeleteRequest(ws);

    ws.emit({
      id: deleteRequest.id,
      jsonrpc: "2.0",
      error: { code: -32603, message: "Client not found" },
    });
    await cleanupPromise;

    expect(localStorage.getItem("snapcast-pending-client-cleanup")).toBeNull();
    warnSpy.mockRestore();
  });
});
