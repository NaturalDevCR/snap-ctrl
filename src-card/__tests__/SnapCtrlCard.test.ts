import { beforeEach, describe, expect, it } from "vitest";
import { SnapCtrlCard } from "@/../src-card/SnapCtrlCard";

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
    if (this.readyState === FakeWebSocket.CLOSED) return;
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

/** A socket counts as "live" if it hasn't reached the CLOSED state. */
function liveSockets(): FakeWebSocket[] {
  return FakeWebSocket.instances.filter((ws) => ws.readyState !== FakeWebSocket.CLOSED);
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  (globalThis as any).WebSocket = FakeWebSocket;
  if (!customElements.get("snap-ctrl-card-test")) {
    customElements.define("snap-ctrl-card-test", SnapCtrlCard);
  }
});

describe("SnapCtrlCard lifecycle", () => {
  it("disconnects the socket on detach instead of leaking it", () => {
    const el = document.createElement("snap-ctrl-card-test") as SnapCtrlCard;
    el.setConfig({ host: "host-a", port: 1780 });
    document.body.appendChild(el); // connectedCallback -> mounts, creates a socket

    expect(liveSockets()).toHaveLength(1);

    document.body.removeChild(el); // disconnectedCallback

    expect(liveSockets()).toHaveLength(0);
  });

  it("reattaches using the most recently applied config, not the original one", () => {
    const el = document.createElement("snap-ctrl-card-test") as SnapCtrlCard;
    el.setConfig({ host: "host-a", port: 1780 });
    document.body.appendChild(el);
    expect(FakeWebSocket.instances[0]!.url).toContain("host-a");

    // A live config change while mounted.
    el.setConfig({ host: "host-b", port: 1780 });
    expect(FakeWebSocket.instances[1]!.url).toContain("host-b");

    // Detach then reattach — the masonry-relayout scenario.
    document.body.removeChild(el);
    expect(liveSockets()).toHaveLength(0);

    document.body.appendChild(el);

    const live = liveSockets();
    expect(live).toHaveLength(1);
    expect(live[0]!.url).toContain("host-b");
    expect(live[0]!.url).not.toContain("host-a");
  });
});
