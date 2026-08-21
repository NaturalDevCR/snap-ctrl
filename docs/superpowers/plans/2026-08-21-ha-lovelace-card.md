# HA Lovelace Custom Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<snap-ctrl-card>`, a standalone Home Assistant Lovelace custom card (volume + mute + group join/unjoin per zone) built from this repo, distributed independently of the existing app/addon.

**Architecture:** New build target (`vite.config.card.ts`, library mode) compiles `src-card/main.ts` into a single self-contained ES module that registers a custom element. The card owns its own Snapcast WebSocket connection per instance (no Pinia, no shared app state) via a new framework-agnostic `src/services/snapcastClient.ts`, extracted from the existing Pinia store so both the app and the card share one connection/reconnect/JSON-RPC implementation. UI is new, small Vue SFCs under `src-card/`, styled with HA's CSS custom properties instead of Tailwind.

**Tech Stack:** Vue 3 (`defineCustomElement`), TypeScript, Vite (library mode), Vitest (existing test runner/conventions), native `WebSocket`, HA frontend's globally-registered `ha-card`/`ha-textfield`/`ha-switch`/`ha-formfield` elements (referenced by tag name, no import).

## Global Constraints

- Node engines: `^20.19.0 || >=22.12.0` (from [package.json](../../../package.json)) — no APIs newer than what those Node versions support in build tooling.
- Test runner: Vitest, jsdom environment, files under `src/**/*.{test,spec}.ts`, following existing patterns in `src/stores/__tests__/`, `src/composables/__tests__/`, `src/utils/__tests__/` (per [vitest.config.ts](../../../vitest.config.ts)).
- Existing test suites (`src/stores/__tests__/snapcast.test.ts`, `src/stores/__tests__/auth.test.ts`, all `src/composables/__tests__`, all `src/utils/__tests__`) must continue passing unchanged after any refactor.
- No Tailwind, no Pinia, no Vue Router in anything under `src-card/` — the card must build to a self-contained bundle with zero dependency on the main app's global state.
- Follow existing project convention: pure logic (services, composables, utils) gets Vitest unit tests; `.vue` SFCs are not unit-tested directly (no `.vue` test files exist anywhere in this repo today) — verify UI wiring by building and manually loading the bundle.
- Card JSON-RPC method/param shapes must match the existing protocol usage in [src/stores/snapcast.ts](../../../src/stores/snapcast.ts) exactly (`Client.SetVolume`, `Group.SetClients`, etc.) — this is a real Snapcast server protocol, not something to redesign.

---

### Task 1: Break the Pinia dependency out of the domain types

**Files:**
- Modify: `src/types/snapcast-rpc.ts`
- Modify: `src/stores/snapcast.ts:15-80` (interface definitions), `src/stores/snapcast.ts:7-10` (import)

**Interfaces:**
- Produces: `Client`, `Group`, `Stream`, `ServerStatus` interfaces now live in `src/types/snapcast-rpc.ts`, with no dependency on `src/stores/snapcast.ts`. `src/stores/snapcast.ts` re-exports them (`export type { Client, Group, Stream, ServerStatus }`) so every existing consumer (`GroupFilterModal.vue`, `ZoneGrid.vue`, `ClientDetailsModal.vue`, etc., all currently doing `import type { Client } from "@/stores/snapcast"`) keeps working unchanged.

**Why:** `src/types/snapcast-rpc.ts` currently does `import type { Client, Group, ServerStatus, Stream } from "@/stores/snapcast"` — a circular dependency where the "protocol types" file depends on the Pinia store. The card (and the new `snapcastClient.ts` in Task 2) must not import Pinia at all, so these domain types need to live somewhere that doesn't transitively pull in `defineStore`.

- [ ] **Step 1: Move the interface definitions**

In `src/types/snapcast-rpc.ts`, replace the top import line:

```ts
import type { Client, Group, ServerStatus, Stream } from "@/stores/snapcast";
```

with the actual interface definitions (moved verbatim from `src/stores/snapcast.ts:15-80`):

```ts
export interface Client {
  id: string;
  name: string;
  host: {
    name: string;
    ip: string;
    mac: string;
    arch: string;
    os: string;
  };
  connected: boolean;
  config: {
    instance: number;
    latency: number;
    name: string;
    volume: {
      muted: boolean;
      percent: number;
    };
  };
  snapclient: {
    name: string;
    version: string;
    protocolVersion: number;
  };
  lastSeen: {
    sec: number;
    usec: number;
  };
}

export interface Group {
  id: string;
  name: string;
  stream_id: string;
  clients: Client[];
  muted: boolean;
}

export interface Stream {
  id: string;
  uri: string;
  status: string;
}

export interface ServerStatus {
  server: {
    groups: Group[];
    streams: Stream[];
    server: {
      host: {
        arch: string;
        ip: string;
        mac: string;
        name: string;
        os: string;
      };
      snapserver: {
        controlProtocolVersion: number;
        name: string;
        protocolVersion: number;
        version: string;
      };
    };
  };
}
```

Remove the old `export type { Client, Group, ServerStatus, Stream };` line at the bottom of the file (line 93) — the interfaces are now defined directly in this file, no re-export needed here.

- [ ] **Step 2: Update the store to import instead of define**

In `src/stores/snapcast.ts`, replace lines 7-10:

```ts
import type {
  ServerStatusResult,
  SnapcastInboundMessage,
} from "@/types/snapcast-rpc";
```

with:

```ts
import type {
  Client,
  Group,
  ServerStatus,
  ServerStatusResult,
  SnapcastInboundMessage,
  Stream,
} from "@/types/snapcast-rpc";

export type { Client, Group, ServerStatus, Stream };
```

Then delete the four interface definitions at `src/stores/snapcast.ts:15-80` (`Client`, `Group`, `Stream`, `ServerStatus`) — they're now imported from `@/types/snapcast-rpc` and re-exported by the line just added.

- [ ] **Step 3: Verify existing tests still pass**

Run: `pnpm test`
Expected: all existing suites pass (no test file changes in this task — this is a pure type-location refactor with no behavior change).

- [ ] **Step 4: Verify no circular import remains**

Run: `pnpm type-check`
Expected: no TypeScript errors. (This also catches any consumer that was relying on a type shape mismatch.)

- [ ] **Step 5: Commit**

```bash
git add src/types/snapcast-rpc.ts src/stores/snapcast.ts
git commit -m "refactor: move Snapcast domain types out of the Pinia store

Client/Group/Stream/ServerStatus now live in src/types/snapcast-rpc.ts
with no dependency on the store. The store re-exports them so existing
consumers are unaffected. This unblocks a Pinia-free service layer
(next task) that the upcoming Lovelace card can use directly."
```

---

### Task 2: Extract the shared Snapcast WebSocket client

**Files:**
- Create: `src/services/snapcastClient.ts`
- Test: `src/services/__tests__/snapcastClient.test.ts`

**Interfaces:**
- Consumes: `SnapcastInboundMessage` type from `@/types/snapcast-rpc` (Task 1).
- Produces:
  ```ts
  export type SnapcastClientStatus = "disconnected" | "connecting" | "connected";

  export interface SnapcastClientOptions {
    url: string;
    requestTimeoutMs?: number; // default 10_000
    maxReconnectAttempts?: number; // default 10
    baseReconnectDelayMs?: number; // default 1000
    maxReconnectDelayMs?: number; // default 30_000
  }

  export interface SnapcastClient {
    connect(): void;
    disconnect(): void;
    request<T = unknown>(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<T>;
    onEvent(handler: (msg: SnapcastInboundMessage) => void): () => void;
    onStatusChange(handler: (status: SnapcastClientStatus, error: string | null) => void): () => void;
    getStatus(): SnapcastClientStatus;
  }

  export function createSnapcastClient(options: SnapcastClientOptions): SnapcastClient;
  ```
  Used by: Task 3 (refactored store), Task 6 (`useCardConnection.ts`).

This module is plain TypeScript — no Vue, no Pinia — so both the store and the card can use one implementation of connect/reconnect/request-timeout/event-dispatch.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/snapcastClient.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/services/__tests__/snapcastClient.test.ts`
Expected: FAIL — `Cannot find module '@/services/snapcastClient'`.

- [ ] **Step 3: Implement `src/services/snapcastClient.ts`**

```ts
import type { SnapcastInboundMessage } from "@/types/snapcast-rpc";

export type SnapcastClientStatus = "disconnected" | "connecting" | "connected";

export interface SnapcastClientOptions {
  url: string;
  requestTimeoutMs?: number;
  maxReconnectAttempts?: number;
  baseReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

export interface SnapcastClient {
  connect(): void;
  disconnect(): void;
  request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs?: number
  ): Promise<T>;
  onEvent(handler: (msg: SnapcastInboundMessage) => void): () => void;
  onStatusChange(
    handler: (status: SnapcastClientStatus, error: string | null) => void
  ): () => void;
  getStatus(): SnapcastClientStatus;
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_BASE_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

export function createSnapcastClient(
  options: SnapcastClientOptions
): SnapcastClient {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const maxReconnectAttempts =
    options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  const baseReconnectDelayMs =
    options.baseReconnectDelayMs ?? DEFAULT_BASE_RECONNECT_DELAY_MS;
  const maxReconnectDelayMs =
    options.maxReconnectDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;

  let websocket: WebSocket | null = null;
  let status: SnapcastClientStatus = "disconnected";
  let lastError: string | null = null;
  let requestId = 1;
  let manualDisconnect = false;
  let hasConnectedSuccessfully = false;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  const eventHandlers = new Set<(msg: SnapcastInboundMessage) => void>();
  const statusHandlers = new Set<
    (status: SnapcastClientStatus, error: string | null) => void
  >();

  function setStatus(next: SnapcastClientStatus, error: string | null = null) {
    status = next;
    lastError = error;
    for (const handler of statusHandlers) handler(next, error);
  }

  function getReconnectDelay(): number {
    return Math.min(
      baseReconnectDelayMs * Math.pow(2, reconnectAttempts),
      maxReconnectDelayMs
    );
  }

  function scheduleReconnect() {
    if (!hasConnectedSuccessfully || manualDisconnect) return;
    if (reconnectTimeout) return;
    if (reconnectAttempts >= maxReconnectAttempts) {
      setStatus("disconnected", "Maximum reconnection attempts reached");
      return;
    }
    const delay = getReconnectDelay();
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      reconnectAttempts++;
      connect();
    }, delay);
  }

  function connect() {
    if (websocket?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    manualDisconnect = false;
    setStatus("connecting");

    try {
      websocket = new WebSocket(options.url);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus("disconnected", message);
      scheduleReconnect();
      return;
    }

    websocket.onopen = () => {
      hasConnectedSuccessfully = true;
      reconnectAttempts = 0;
      setStatus("connected");
    };

    websocket.onclose = (event) => {
      const wasManual = manualDisconnect;
      setStatus("disconnected", wasManual ? null : `Connection lost: ${event.reason || "unknown reason"}`);
      if (!wasManual) scheduleReconnect();
    };

    websocket.onerror = () => {
      setStatus("disconnected", "WebSocket connection error");
    };

    websocket.onmessage = (event) => {
      let data: SnapcastInboundMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if ("method" in data) {
        for (const handler of eventHandlers) handler(data);
      }
    };
  }

  function disconnect() {
    manualDisconnect = true;
    reconnectAttempts = 0;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (websocket) {
      websocket.close();
      websocket = null;
    }
    setStatus("disconnected");
  }

  function request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs: number = requestTimeoutMs
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"));
        return;
      }

      const id = requestId++;
      const message = { id, jsonrpc: "2.0", method, ...(params && { params }) };

      const cleanup = () => {
        websocket?.removeEventListener("message", messageHandler);
        clearTimeout(timeout);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Request timeout"));
      }, timeoutMs);

      const messageHandler = (event: MessageEvent) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.id === id) {
          cleanup();
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        }
      };

      websocket.addEventListener("message", messageHandler);
      websocket.send(JSON.stringify(message));
    });
  }

  function onEvent(handler: (msg: SnapcastInboundMessage) => void) {
    eventHandlers.add(handler);
    return () => eventHandlers.delete(handler);
  }

  function onStatusChange(
    handler: (status: SnapcastClientStatus, error: string | null) => void
  ) {
    statusHandlers.add(handler);
    return () => statusHandlers.delete(handler);
  }

  function getStatus() {
    return status;
  }

  return { connect, disconnect, request, onEvent, onStatusChange, getStatus };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/services/__tests__/snapcastClient.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/snapcastClient.ts src/services/__tests__/snapcastClient.test.ts
git commit -m "feat: add framework-agnostic snapcastClient service

Extracts connect/reconnect/JSON-RPC-request/event-dispatch logic that
currently lives inline in the Pinia store into a plain TypeScript
module with no Vue/Pinia dependency, so it can be shared between the
app's store and the upcoming Lovelace card."
```

---

### Task 3: Refactor the Pinia store to use `snapcastClient`

**Files:**
- Modify: `src/stores/snapcast.ts`

**Interfaces:**
- Consumes: `createSnapcastClient` from `@/services/snapcastClient` (Task 2).
- Produces: no change to the store's public interface (`host`, `isConnected`, `isConnecting`, `connectionError`, `serverStatus`, `clients`, `groups`, `streams`, `connect`, `disconnect`, `setClientVolume`, etc. — every existing consumer keeps working).

This task must not change any externally-observable store behavior — it's an internal implementation swap, verified entirely by the existing test suite passing unchanged.

- [ ] **Step 1: Replace the websocket/request internals**

In `src/stores/snapcast.ts`, add the import at the top (alongside the existing imports):

```ts
import { createSnapcastClient } from "@/services/snapcastClient";
```

Remove the now-redundant local state and functions: `websocket` ref, `requestId` ref, `reconnectAttempts` ref, `maxReconnectAttempts`, `baseReconnectDelay`, `maxReconnectDelay`, `reconnectTimeout`, `manualDisconnect`, `getReconnectDelay()`, `scheduleReconnect()`, and the bodies of `connect()`, `disconnect()`, `sendRequest()`. Replace them with a single client instance and thin wrapper functions:

```ts
    let client: ReturnType<typeof createSnapcastClient> | null = null;

    function buildWsUrl(): string {
      if ((window as any).__HA_SNAPCAST_HOST__) {
        const base = new URL("./jsonrpc", window.location.href);
        base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
        return base.toString();
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${host.value}/jsonrpc`;
    }

    function connect() {
      if (client) {
        client.disconnect();
      }
      client = createSnapcastClient({ url: buildWsUrl() });

      client.onStatusChange((status, error) => {
        isConnecting.value = status === "connecting";
        isConnected.value = status === "connected";
        connectionError.value = error;
        if (status === "connected") {
          hasConnectedSuccessfully.value = true;
          getServerStatus();
        }
      });

      client.onEvent((data) => handleMessage(data));

      hasConnectedSuccessfully.value = false;
      client.connect();
    }

    function disconnect() {
      client?.disconnect();
      client = null;
      isConnected.value = false;
      isConnecting.value = false;
      connectionError.value = null;
    }

    function sendRequest(
      method: string,
      params?: Record<string, unknown>,
      timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
    ): Promise<any> {
      if (!client) {
        return Promise.reject(new Error("WebSocket not connected"));
      }
      return client.request(method, params, timeoutMs);
    }
```

Remove the now-unused `hasConnectedSuccessfully` reset logic inside `setHost()` that referenced `reconnectAttempts`/`reconnectTimeout` — simplify it to:

```ts
    function setHost(newHost: string) {
      const cleanHost = newHost
        .replace(/^https?:\/\//, "")
        .replace(/^wss?:\/\//, "")
        .replace(/\/$/, "");
      if (cleanHost !== host.value) {
        hasConnectedSuccessfully.value = false;
      }
      host.value = cleanHost;
    }
```

Keep `handleMessage`, `updateLocalState`, `applyServerResult`, `getServerStatus`, and every `setClient*`/`setGroup*` action exactly as they are today — they only call `sendRequest`, whose signature is unchanged.

- [ ] **Step 2: Update the existing store test's fake to match the new connection flow**

The existing test file mocks the global `WebSocket` constructor, which `snapcastClient` still calls directly (`new WebSocket(url)`), so no test rewrite is needed. Open `src/stores/__tests__/snapcast.test.ts` and re-read it once against the new `connect()` to confirm: `store.connect()` still results in exactly one `new WebSocket(...)` call visible as `FakeWebSocket.instances[0]`, `ws.open()` still triggers `Server.GetStatus`, and `ws.emit(...)` still reaches `handleMessage`. This holds true unchanged given the refactor above — no test edits required.

- [ ] **Step 3: Run the full existing test suite**

Run: `pnpm test`
Expected: PASS — every existing suite (`snapcast.test.ts`, `auth.test.ts`, all composable/util tests) passes with no modifications.

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/stores/snapcast.ts
git commit -m "refactor: back the Pinia store's connection with snapcastClient

The store's connect/disconnect/sendRequest now delegate to the shared
snapcastClient service instead of managing WebSocket/reconnect state
inline. Public store interface and behavior are unchanged — verified
by the existing test suite passing without modification."
```

---

### Task 4: Scaffold the card build target

**Files:**
- Create: `vite.config.card.ts`
- Create: `src-card/main.ts`
- Modify: `package.json` (add `build:card` script)

**Interfaces:**
- Produces: `pnpm build:card` outputs `dist-card/snap-ctrl-card.js`, an ES module whose only side effect is `customElements.define("snap-ctrl-card", SnapCtrlCardStub)`. Later tasks replace `SnapCtrlCardStub` with the real implementation (Task 9) without changing this build config.

- [ ] **Step 1: Create the stub custom element**

Create `src-card/main.ts`:

```ts
class SnapCtrlCardStub extends HTMLElement {
  connectedCallback() {
    this.textContent = "snap-ctrl-card: not yet configured";
  }
}

if (!customElements.get("snap-ctrl-card")) {
  customElements.define("snap-ctrl-card", SnapCtrlCardStub);
}
```

- [ ] **Step 2: Create the library-mode Vite config**

Create `vite.config.card.ts`:

```ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Build config for the standalone Home Assistant Lovelace custom card.
// Produces a single self-contained ES module — no Tailwind, no Pinia,
// no router. See docs/superpowers/specs/2026-08-21-lovelace-card-design.md.
export default defineConfig({
  build: {
    outDir: "dist-card",
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("./src-card/main.ts", import.meta.url)),
      formats: ["es"],
      fileName: () => "snap-ctrl-card.js",
    },
    rollupOptions: {
      output: {
        // Single file, no code-splitting — the card must be a single
        // resource a user can drop into HA's www/ folder.
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add the build script**

In `package.json`, in the `"scripts"` block, add a new entry right after `"build-only:ha"`:

```json
    "build:card": "vue-tsc --build && vite build --config vite.config.card.ts",
```

- [ ] **Step 4: Run the build**

Run: `pnpm build:card`
Expected: succeeds, produces `dist-card/snap-ctrl-card.js`.

- [ ] **Step 5: Smoke-test the stub in a browser**

Run: `python3 -m http.server 8765 --directory dist-card &` (or any static file server) and open a scratch HTML file that loads it:

Create `/tmp/card-smoke-test.html` with:

```html
<!doctype html>
<script type="module" src="http://localhost:8765/snap-ctrl-card.js"></script>
<snap-ctrl-card></snap-ctrl-card>
```

Open it in the Browser pane preview and confirm the page shows the text "snap-ctrl-card: not yet configured", then stop the static server. Delete `/tmp/card-smoke-test.html` afterward — it's a throwaway smoke check, not part of the repo.

- [ ] **Step 6: Add `dist-card/` to `.gitignore`**

Check `.gitignore` for an existing `dist` entry; add `dist-card` next to it (same pattern already used for `addon/dist`/`dist`).

- [ ] **Step 7: Commit**

```bash
git add vite.config.card.ts src-card/main.ts package.json .gitignore
git commit -m "build: scaffold standalone build target for the Lovelace card

Adds vite.config.card.ts (library mode, single ES module output) and
a stub custom element, following the existing precedent of
vite.config.ha.ts as a separate build target from the main app."
```

---

### Task 5: Zone filter utility

**Files:**
- Create: `src-card/utils/applyZoneFilter.ts`
- Test: `src-card/utils/__tests__/applyZoneFilter.test.ts`

**Interfaces:**
- Consumes: `Group` type from `@/types/snapcast-rpc`.
- Produces: `applyZoneFilter(groups: Group[], zoneFilter: string[] | undefined): Group[]`, used by Task 8 (`CardZoneGrid.vue`) and Task 6 (`useCardConnection.ts` re-exposes raw groups; filtering happens at render time in the grid, not in the connection composable — kept separate so filter changes don't require reconnecting).

Filter matches on **group name** or **client name** (case-insensitive): a group passes through if its own name matches an entry in `zoneFilter`, or if it contains at least one client whose name matches — in the latter case only the matching clients are kept in the returned group's `clients` array. An empty/undefined `zoneFilter` returns all groups unchanged.

- [ ] **Step 1: Write the failing tests**

Create `src-card/utils/__tests__/applyZoneFilter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyZoneFilter } from "@/../src-card/utils/applyZoneFilter";
import type { Group } from "@/types/snapcast-rpc";

function makeClient(id: string, name: string) {
  return {
    id,
    name,
    host: { name: "", ip: "", mac: "", arch: "", os: "" },
    connected: true,
    config: { instance: 1, latency: 0, name, volume: { muted: false, percent: 50 } },
    snapclient: { name: "Snapclient", version: "0.27.0", protocolVersion: 2 },
    lastSeen: { sec: 0, usec: 0 },
  };
}

function makeGroup(id: string, name: string, clientNames: string[]): Group {
  return {
    id,
    name,
    stream_id: "",
    muted: false,
    clients: clientNames.map((n, i) => makeClient(`${id}-c${i}`, n)),
  };
}

describe("applyZoneFilter", () => {
  const groups = [
    makeGroup("g1", "Living Room", ["Living Room Speaker"]),
    makeGroup("g2", "Kitchen", ["Kitchen Speaker", "Kitchen TV"]),
    makeGroup("g3", "Office", ["Office Speaker"]),
  ];

  it("returns all groups unchanged when no filter is given", () => {
    expect(applyZoneFilter(groups, undefined)).toEqual(groups);
    expect(applyZoneFilter(groups, [])).toEqual(groups);
  });

  it("keeps a whole group when its group name matches", () => {
    const result = applyZoneFilter(groups, ["Kitchen"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g2");
    expect(result[0]!.clients).toHaveLength(2);
  });

  it("keeps only matching clients when filtering by client name", () => {
    const result = applyZoneFilter(groups, ["Kitchen TV"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g2");
    expect(result[0]!.clients).toHaveLength(1);
    expect(result[0]!.clients[0]!.name).toBe("Kitchen TV");
  });

  it("is case-insensitive", () => {
    const result = applyZoneFilter(groups, ["office"]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("g3");
  });

  it("drops groups with no match at all", () => {
    const result = applyZoneFilter(groups, ["Nonexistent Zone"]);
    expect(result).toEqual([]);
  });

  it("combines multiple filter entries across groups", () => {
    const result = applyZoneFilter(groups, ["Living Room", "Kitchen TV"]);
    expect(result.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(result[1]!.clients).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src-card/utils/__tests__/applyZoneFilter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src-card/utils/applyZoneFilter.ts`**

```ts
import type { Group } from "@/types/snapcast-rpc";

export function applyZoneFilter(
  groups: Group[],
  zoneFilter: string[] | undefined
): Group[] {
  if (!zoneFilter || zoneFilter.length === 0) return groups;

  const wanted = zoneFilter.map((name) => name.trim().toLowerCase());

  const result: Group[] = [];
  for (const group of groups) {
    const groupMatches = wanted.includes(group.name.trim().toLowerCase());
    if (groupMatches) {
      result.push(group);
      continue;
    }
    const matchingClients = group.clients.filter((client) =>
      wanted.includes(client.name.trim().toLowerCase())
    );
    if (matchingClients.length > 0) {
      result.push({ ...group, clients: matchingClients });
    }
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src-card/utils/__tests__/applyZoneFilter.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src-card/utils/applyZoneFilter.ts src-card/utils/__tests__/applyZoneFilter.test.ts
git commit -m "feat(card): add applyZoneFilter utility

Pure function used by CardZoneGrid to restrict a card instance to a
subset of zones/clients via the optional zone_filter config field."
```

---

### Task 6: Connection composable

**Files:**
- Create: `src-card/composables/useCardConnection.ts`
- Test: `src-card/composables/__tests__/useCardConnection.test.ts`

**Interfaces:**
- Consumes: `createSnapcastClient` from `@/services/snapcastClient` (Task 2); `Client`, `Group`, `ServerStatus`, `ServerStatusResult`, `SnapcastInboundMessage` from `@/types/snapcast-rpc`.
- Produces:
  ```ts
  export interface UseCardConnectionOptions {
    host: string;
    port: number;
  }

  export interface CardConnection {
    status: Ref<"disconnected" | "connecting" | "connected">;
    error: Ref<string | null>;
    groups: Ref<Group[]>;
    connect(): void;
    disconnect(): void;
    retry(): void;
    request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
  }

  export function useCardConnection(options: UseCardConnectionOptions): CardConnection;
  ```
  Used by: Task 8 (`CardRoot.vue`, provides `groups`/`status`/`error`/`retry`/`request` to descendant components via `provide`).

This mirrors the store's `handleMessage`/`updateLocalState` logic (Task 3) but scoped to one connection instance, with no Pinia/permissions/settings concerns (out of scope per the design spec).

- [ ] **Step 1: Write the failing tests**

Create `src-card/composables/__tests__/useCardConnection.test.ts`:

```ts
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

    ws.emit({ jsonrpc: "2.0", method: "Group.OnMute", params: { id: "g1", mute: true } });
    expect(conn.groups.value[0]!.muted).toBe(true);
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src-card/composables/__tests__/useCardConnection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src-card/composables/useCardConnection.ts`**

```ts
import { ref, type Ref } from "vue";
import { createSnapcastClient } from "@/services/snapcastClient";
import type {
  Group,
  ServerStatusResult,
  SnapcastInboundMessage,
} from "@/types/snapcast-rpc";

export interface UseCardConnectionOptions {
  host: string;
  port: number;
}

export interface CardConnection {
  status: Ref<"disconnected" | "connecting" | "connected">;
  error: Ref<string | null>;
  groups: Ref<Group[]>;
  connect(): void;
  disconnect(): void;
  retry(): void;
  request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
}

export function useCardConnection(
  options: UseCardConnectionOptions
): CardConnection {
  const status = ref<"disconnected" | "connecting" | "connected">("disconnected");
  const error = ref<string | null>(null);
  const groups = ref<Group[]>([]);

  const client = createSnapcastClient({
    url: `ws://${options.host}:${options.port}/jsonrpc`,
  });

  function findClientGroup(clientId: string): Group | undefined {
    return groups.value.find((g) => g.clients.some((c) => c.id === clientId));
  }

  function applyServerResult(result: ServerStatusResult | undefined) {
    if (result?.server?.groups) {
      groups.value = result.server.groups;
    }
  }

  function handleMessage(data: SnapcastInboundMessage) {
    if (!("method" in data)) return;
    switch (data.method) {
      case "Server.OnUpdate":
        if (data.params?.server) groups.value = data.params.server.groups;
        break;
      case "Client.OnVolumeChanged": {
        const group = findClientGroup(data.params.id);
        const client = group?.clients.find((c) => c.id === data.params.id);
        if (client) client.config.volume = data.params.volume;
        break;
      }
      case "Client.OnConnect":
      case "Client.OnDisconnect": {
        const group = findClientGroup(data.params.client.id);
        const existing = group?.clients.find((c) => c.id === data.params.client.id);
        if (existing) {
          existing.connected = data.params.client.connected;
          existing.config = data.params.client.config;
        }
        break;
      }
      case "Group.OnMute": {
        const group = groups.value.find((g) => g.id === data.params.id);
        if (group) group.muted = data.params.mute;
        break;
      }
    }
  }

  client.onStatusChange((next, err) => {
    status.value = next;
    error.value = err;
    if (next === "connected") {
      client.request("Server.GetStatus").then((result: any) => {
        if (result?.server?.groups) groups.value = result.server.groups;
      });
    }
  });

  client.onEvent(handleMessage);

  function connect() {
    client.connect();
  }

  function disconnect() {
    client.disconnect();
  }

  function retry() {
    client.connect();
  }

  function request<T = unknown>(method: string, params?: Record<string, unknown>) {
    return client
      .request<T>(method, params)
      .then((result) => {
        if (method === "Group.SetClients" || method === "Server.DeleteClient") {
          applyServerResult(result as unknown as ServerStatusResult);
        }
        return result;
      });
  }

  return { status, error, groups, connect, disconnect, retry, request };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src-card/composables/__tests__/useCardConnection.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src-card/composables/useCardConnection.ts src-card/composables/__tests__/useCardConnection.test.ts
git commit -m "feat(card): add useCardConnection composable

Scoped-per-instance connection state (status/error/groups) built on
snapcastClient, mirroring the store's Server.GetStatus/OnUpdate and
per-field notification patching without any Pinia/auth/settings
dependency."
```

---

### Task 7: Volume control composable

**Files:**
- Create: `src-card/composables/useVolumeControl.ts`
- Test: `src-card/composables/__tests__/useVolumeControl.test.ts`

**Interfaces:**
- Consumes: `request` function shaped like `CardConnection["request"]` (Task 6).
- Produces:
  ```ts
  export interface UseVolumeControlOptions {
    request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
    debounceMs?: number; // default 80
  }

  export interface VolumeControl {
    setVolume(clientId: string, percent: number, currentMuted: boolean, onOptimistic: (percent: number) => void, onRevert: (percent: number) => void): void;
    setMute(clientId: string, muted: boolean, currentPercent: number, onOptimistic: (muted: boolean) => void, onRevert: (muted: boolean) => void): Promise<void>;
  }

  export function useVolumeControl(options: UseVolumeControlOptions): VolumeControl;
  ```
  Used by: Task 8 (`CardVolumeRow.vue`) — the component owns the displayed value and passes optimistic/revert callbacks so the composable stays presentation-agnostic (no direct DOM/ref coupling, easy to unit test).

`setVolume` debounces rapid slider drags into one `Client.SetVolume` request; `setMute` is not debounced (a single toggle click).

- [ ] **Step 1: Write the failing tests**

Create `src-card/composables/__tests__/useVolumeControl.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useVolumeControl } from "@/../src-card/composables/useVolumeControl";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useVolumeControl", () => {
  it("debounces rapid setVolume calls into a single request with the last value", async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const vc = useVolumeControl({ request, debounceMs: 80 });
    const optimistic: number[] = [];

    vc.setVolume("c1", 10, false, (p) => optimistic.push(p), () => {});
    vc.setVolume("c1", 20, false, (p) => optimistic.push(p), () => {});
    vc.setVolume("c1", 30, false, (p) => optimistic.push(p), () => {});

    // Optimistic callback fires immediately on every call.
    expect(optimistic).toEqual([10, 20, 30]);
    expect(request).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(80);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("Client.SetVolume", {
      id: "c1",
      volume: { percent: 30, muted: false },
    });
  });

  it("reverts optimistic value if the debounced request fails", async () => {
    const request = vi.fn().mockRejectedValue(new Error("boom"));
    const vc = useVolumeControl({ request, debounceMs: 80 });
    let reverted: number | null = null;

    vc.setVolume("c1", 42, false, () => {}, (p) => {
      reverted = p;
    });

    await vi.advanceTimersByTimeAsync(80);
    await Promise.resolve();
    await Promise.resolve();

    expect(reverted).toBe(42); // caller passes the pre-change value as the last arg it wants restored — see Step 3 note
  });

  it("setMute sends immediately without debounce and reverts on failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("boom"));
    const vc = useVolumeControl({ request });
    const optimistic: boolean[] = [];
    let reverted: boolean | null = null;

    await vc.setMute("c1", true, 50, (m) => optimistic.push(m), (m) => {
      reverted = m;
    });

    expect(request).toHaveBeenCalledWith("Client.SetVolume", {
      id: "c1",
      volume: { percent: 50, muted: true },
    });
    expect(optimistic).toEqual([true]);
    expect(reverted).toBe(false);
  });
});
```

Note on the revert-value contract (resolved during implementation, not left ambiguous): `onRevert` is always called with the **pre-change** value the caller supplies as part of the closure — the composable does not track previous state itself (it's stateless across calls by design, so debounced multi-step drags don't need history). `CardVolumeRow.vue` (Task 8) is responsible for capturing "value before this gesture" and passing it into the `onRevert` closure. The test above reflects this: the test's `onRevert` closure hardcodes the value the caller wants restored (`42` and `false` respectively), it does not receive it from the composable's internal state.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src-card/composables/__tests__/useVolumeControl.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src-card/composables/useVolumeControl.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src-card/composables/__tests__/useVolumeControl.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src-card/composables/useVolumeControl.ts src-card/composables/__tests__/useVolumeControl.test.ts
git commit -m "feat(card): add useVolumeControl composable

Debounced Client.SetVolume for slider drags, immediate (undebounced)
request for mute toggles, with optimistic-update/revert callbacks so
the component owns displayed state and the composable stays
presentation-agnostic."
```

---

### Task 8: Card UI components

**Files:**
- Create: `src-card/components/CardConnectionError.vue`
- Create: `src-card/components/CardVolumeRow.vue`
- Create: `src-card/components/CardGroupControls.vue`
- Create: `src-card/components/CardZoneGrid.vue`
- Create: `src-card/components/CardRoot.vue`

**Interfaces:**
- Consumes: `useCardConnection` (Task 6), `useVolumeControl` (Task 7), `applyZoneFilter` (Task 5), `Client`/`Group` types (`@/types/snapcast-rpc`).
- Produces: `CardRoot.vue` exposes `defineExpose({ setConfig, setHass })` — `setConfig(config: { host: string; port: number; title?: string; zone_filter?: string[] })` and `setHass(hass: unknown)` (stored but unused beyond a future theme read) — called by `SnapCtrlCard.ts` (Task 9), which is the only consumer.

No new unit tests in this task — per the Global Constraints, `.vue` SFCs follow the existing project convention of no direct component tests; all their logic (filtering, debounce, connection state machine) is already covered by Tasks 5–7's composable/util tests. Verification here is a manual build-and-load smoke test.

- [ ] **Step 1: `CardConnectionError.vue`**

```vue
<script setup lang="ts">
defineProps<{
  status: "disconnected" | "connecting" | "connected";
  error: string | null;
}>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div v-if="status !== 'connected'" class="connection-state">
    <p v-if="status === 'connecting'">Connecting to Snapcast server…</p>
    <template v-else>
      <p>{{ error || "Disconnected from Snapcast server." }}</p>
      <button type="button" @click="emit('retry')">Retry now</button>
    </template>
  </div>
</template>

<style scoped>
.connection-state {
  padding: 16px;
  color: var(--secondary-text-color, #666);
  text-align: center;
}
button {
  margin-top: 8px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: var(--primary-color, #03a9f4);
  color: var(--text-primary-color, #fff);
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: `CardVolumeRow.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from "vue";
import type { Client } from "@/types/snapcast-rpc";
import { useVolumeControl } from "../composables/useVolumeControl";

const props = defineProps<{
  client: Client;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

const displayPercent = ref(props.client.config.volume.percent);
const displayMuted = ref(props.client.config.volume.muted);

watch(
  () => props.client.config.volume,
  (v) => {
    displayPercent.value = v.percent;
    displayMuted.value = v.muted;
  }
);

const volumeControl = useVolumeControl({ request: props.request });

function onSlide(event: Event) {
  const percent = Number((event.target as HTMLInputElement).value);
  const before = displayPercent.value;
  volumeControl.setVolume(
    props.client.id,
    percent,
    displayMuted.value,
    (p) => (displayPercent.value = p),
    () => (displayPercent.value = before)
  );
}

function onToggleMute() {
  const before = displayMuted.value;
  volumeControl.setMute(
    props.client.id,
    !before,
    displayPercent.value,
    (m) => (displayMuted.value = m),
    (m) => (displayMuted.value = m)
  );
}
</script>

<template>
  <div class="volume-row">
    <span class="name">{{ client.config.name || client.name }}</span>
    <button type="button" class="mute" :aria-pressed="displayMuted" @click="onToggleMute">
      {{ displayMuted ? "🔇" : "🔊" }}
    </button>
    <input
      type="range"
      min="0"
      max="100"
      :value="displayPercent"
      :disabled="!client.connected"
      @input="onSlide"
    />
    <span class="percent">{{ displayPercent }}%</span>
  </div>
</template>

<style scoped>
.volume-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--divider-color, #e0e0e0);
}
.name {
  flex: 1;
  color: var(--primary-text-color, #212121);
}
.mute {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1em;
}
input[type="range"] {
  flex: 2;
  accent-color: var(--primary-color, #03a9f4);
}
.percent {
  width: 3em;
  text-align: right;
  color: var(--secondary-text-color, #666);
}
</style>
```

- [ ] **Step 3: `CardGroupControls.vue`**

```vue
<script setup lang="ts">
import type { Client, Group } from "@/types/snapcast-rpc";

const props = defineProps<{
  client: Client;
  groups: Group[];
  currentGroupId: string;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

function onChangeGroup(event: Event) {
  const targetGroupId = (event.target as HTMLSelectElement).value;
  if (targetGroupId === props.currentGroupId) return;

  const targetGroup = props.groups.find((g) => g.id === targetGroupId);
  if (!targetGroup) return;

  const newClientIds = [...targetGroup.clients.map((c) => c.id), props.client.id];
  props.request("Group.SetClients", { id: targetGroupId, clients: newClientIds });
}
</script>

<template>
  <select class="group-select" :value="currentGroupId" @change="onChangeGroup">
    <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name || g.id }}</option>
  </select>
</template>

<style scoped>
.group-select {
  margin-left: 8px;
  background: var(--card-background-color, #fff);
  color: var(--primary-text-color, #212121);
  border: 1px solid var(--divider-color, #e0e0e0);
  border-radius: 4px;
  padding: 2px 4px;
}
</style>
```

- [ ] **Step 4: `CardZoneGrid.vue`**

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { Group } from "@/types/snapcast-rpc";
import { applyZoneFilter } from "../utils/applyZoneFilter";
import CardVolumeRow from "./CardVolumeRow.vue";
import CardGroupControls from "./CardGroupControls.vue";

const props = defineProps<{
  groups: Group[];
  zoneFilter: string[] | undefined;
  request: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>;
}>();

const visibleGroups = computed(() => applyZoneFilter(props.groups, props.zoneFilter));
</script>

<template>
  <div class="zone-grid">
    <section v-for="group in visibleGroups" :key="group.id" class="zone">
      <h3>{{ group.name || group.id }}</h3>
      <div v-for="client in group.clients" :key="client.id" class="client-line">
        <CardVolumeRow :client="client" :request="request" />
        <CardGroupControls
          :client="client"
          :groups="groups"
          :current-group-id="group.id"
          :request="request"
        />
      </div>
    </section>
    <p v-if="visibleGroups.length === 0" class="empty">No zones to show.</p>
  </div>
</template>

<style scoped>
.zone {
  margin-bottom: 16px;
}
.zone h3 {
  margin: 0 0 4px;
  color: var(--primary-text-color, #212121);
  font-size: 1em;
}
.client-line {
  display: flex;
  align-items: center;
}
.empty {
  color: var(--secondary-text-color, #666);
  text-align: center;
  padding: 16px;
}
</style>
```

- [ ] **Step 5: `CardRoot.vue`**

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useCardConnection } from "../composables/useCardConnection";
import CardConnectionError from "./CardConnectionError.vue";
import CardZoneGrid from "./CardZoneGrid.vue";

export interface CardConfig {
  host: string;
  port: number;
  title?: string;
  zone_filter?: string[];
}

const config = ref<CardConfig | null>(null);
const connection = ref<ReturnType<typeof useCardConnection> | null>(null);

function setConfig(next: CardConfig) {
  config.value = next;
  connection.value?.disconnect();
  connection.value = useCardConnection({ host: next.host, port: next.port });
  connection.value.connect();
}

function setHass(_hass: unknown) {
  // Reserved for reading HA theme metadata in a future iteration; the
  // card currently relies entirely on CSS custom properties already
  // applied to the document by the HA frontend, which requires no
  // explicit hass handling.
}

function retry() {
  connection.value?.retry();
}

defineExpose({ setConfig, setHass });
</script>

<template>
  <ha-card :header="config?.title">
    <div class="card-content">
      <template v-if="connection">
        <CardConnectionError
          :status="connection.status.value"
          :error="connection.error.value"
          @retry="retry"
        />
        <CardZoneGrid
          v-if="connection.status.value === 'connected'"
          :groups="connection.groups.value"
          :zone-filter="config?.zone_filter"
          :request="connection.request"
        />
      </template>
      <p v-else class="empty">Card not configured.</p>
    </div>
  </ha-card>
</template>

<style scoped>
.card-content {
  padding: 8px 16px 16px;
}
.empty {
  color: var(--secondary-text-color, #666);
  text-align: center;
  padding: 16px;
}
</style>
```

- [ ] **Step 6: Manual smoke test via `pnpm build:card` + Browser pane**

Task 9 wires `CardRoot.vue` into the actual custom element, so a full manual check happens there. For this task, just confirm the type-checker and Vue compiler accept the new files:

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src-card/components
git commit -m "feat(card): add card UI components

CardConnectionError (status/retry), CardVolumeRow (slider + mute,
debounced), CardGroupControls (join/unjoin via Group.SetClients),
CardZoneGrid (renders filtered groups), CardRoot (owns the
per-instance connection, exposes setConfig/setHass for the custom
element wrapper)."
```

---

### Task 9: Custom element wrapper and config editor

**Files:**
- Create: `src-card/SnapCtrlCard.ts`
- Create: `src-card/CardEditor.ts`
- Modify: `src-card/main.ts`

**Interfaces:**
- Consumes: `CardRoot.vue` and its `CardConfig` type (Task 8).
- Produces: the real `snap-ctrl-card` custom element, replacing the Task 4 stub; `snap-ctrl-card-editor` custom element for the dashboard's visual card editor.

- [ ] **Step 1: Implement `SnapCtrlCard.ts`**

```ts
import { createApp, type App } from "vue";
import CardRoot, { type CardConfig } from "./components/CardRoot.vue";

export class SnapCtrlCard extends HTMLElement {
  private app: App | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private rootRef: InstanceType<typeof CardRoot> | null = null;
  private pendingConfig: CardConfig | null = null;
  private pendingHass: unknown = null;

  connectedCallback() {
    if (this.app) return;
    const shadow = this.attachShadow({ mode: "open" });
    this.mountPoint = document.createElement("div");
    shadow.appendChild(this.mountPoint);

    this.app = createApp(CardRoot);
    const instance = this.app.mount(this.mountPoint) as unknown as InstanceType<
      typeof CardRoot
    >;
    this.rootRef = instance;

    if (this.pendingConfig) instance.setConfig(this.pendingConfig);
    if (this.pendingHass) instance.setHass(this.pendingHass);
  }

  disconnectedCallback() {
    this.app?.unmount();
    this.app = null;
    this.rootRef = null;
  }

  setConfig(config: Partial<CardConfig>) {
    if (!config.host) {
      throw new Error("snap-ctrl-card: 'host' is required in the card config");
    }
    const normalized: CardConfig = {
      host: config.host,
      port: config.port ?? 1780,
      title: config.title,
      zone_filter:
        config.zone_filter && config.zone_filter.length > 0
          ? config.zone_filter
          : undefined,
    };
    if (this.rootRef) {
      this.rootRef.setConfig(normalized);
    } else {
      this.pendingConfig = normalized;
    }
  }

  set hass(hass: unknown) {
    if (this.rootRef) {
      this.rootRef.setHass(hass);
    } else {
      this.pendingHass = hass;
    }
  }

  getCardSize() {
    return 3;
  }

  static getStubConfig() {
    return { host: "localhost", port: 1780 };
  }

  static getConfigElement() {
    return document.createElement("snap-ctrl-card-editor");
  }
}
```

- [ ] **Step 2: Implement `CardEditor.ts`**

```ts
import type { CardConfig } from "./components/CardRoot.vue";

export class SnapCtrlCardEditor extends HTMLElement {
  private config: Partial<CardConfig> = {};

  setConfig(config: Partial<CardConfig>) {
    this.config = config;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private emitChange(next: Partial<CardConfig>) {
    this.config = { ...this.config, ...next };
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: this.config },
        bubbles: true,
        composed: true,
      })
    );
  }

  private render() {
    this.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.style.padding = "8px";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "8px";

    wrapper.appendChild(
      this.buildTextField("host", "Host", this.config.host ?? "", (v) =>
        this.emitChange({ host: v })
      )
    );
    wrapper.appendChild(
      this.buildTextField(
        "port",
        "Port",
        String(this.config.port ?? 1780),
        (v) => this.emitChange({ port: Number(v) || 1780 })
      )
    );
    wrapper.appendChild(
      this.buildTextField("title", "Title (optional)", this.config.title ?? "", (v) =>
        this.emitChange({ title: v || undefined })
      )
    );
    wrapper.appendChild(
      this.buildTextField(
        "zone_filter",
        "Zone filter (comma-separated, optional)",
        (this.config.zone_filter ?? []).join(", "),
        (v) =>
          this.emitChange({
            zone_filter: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
      )
    );

    this.appendChild(wrapper);
  }

  private buildTextField(
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void
  ) {
    const field = document.createElement("ha-textfield") as HTMLElement & {
      label?: string;
      value?: string;
    };
    field.setAttribute("id", id);
    field.label = label;
    field.value = value;
    field.addEventListener("input", (e) => {
      onChange((e.target as HTMLInputElement).value);
    });
    return field;
  }
}
```

- [ ] **Step 3: Register both elements in `main.ts`**

Replace the entire contents of `src-card/main.ts` with:

```ts
import { SnapCtrlCard } from "./SnapCtrlCard";
import { SnapCtrlCardEditor } from "./CardEditor";

if (!customElements.get("snap-ctrl-card-editor")) {
  customElements.define("snap-ctrl-card-editor", SnapCtrlCardEditor);
}
if (!customElements.get("snap-ctrl-card")) {
  customElements.define("snap-ctrl-card", SnapCtrlCard);
}

// Advertise the card to HA's "Add Card" picker.
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "snap-ctrl-card",
  name: "Snap Ctrl",
  description: "Snapcast zone volume and grouping controls.",
});
```

- [ ] **Step 4: Build and type-check**

Run: `pnpm build:card`
Expected: succeeds, `dist-card/snap-ctrl-card.js` regenerated.

Run: `pnpm type-check`
Expected: no errors.

- [ ] **Step 5: Manual smoke test with a fake `hass` and a real config**

Create `/tmp/card-full-smoke-test.html`:

```html
<!doctype html>
<style>
  body { background: #111; color: #eee; font-family: sans-serif; }
  ha-card { display: block; max-width: 400px; margin: 20px auto; background: #1c1c1c; border-radius: 12px; padding: 8px; }
</style>
<script type="module" src="http://localhost:8765/snap-ctrl-card.js"></script>
<div id="mount"></div>
<script type="module">
  const el = document.createElement("snap-ctrl-card");
  document.getElementById("mount").appendChild(el);
  el.setConfig({ host: "localhost", port: 1780 });
</script>
```

Serve `dist-card/` (`python3 -m http.server 8765 --directory dist-card &`) and open the smoke test file in the Browser pane. Confirm: no console errors, the card renders `ha-card` chrome (even though `ha-card` isn't defined outside a real HA frontend, it should fall back to an unstyled block — no thrown exception), and shows the "Disconnected"/"Connecting" state (there's no real Snapcast server at `localhost:1780` in this smoke test, so it should show the connection-error state with a working "Retry now" button, not crash). Stop the static server and delete the scratch HTML file afterward.

- [ ] **Step 6: Commit**

```bash
git add src-card/SnapCtrlCard.ts src-card/CardEditor.ts src-card/main.ts
git commit -m "feat(card): implement the real custom element and config editor

SnapCtrlCard.ts wraps CardRoot.vue with the Lovelace custom-card
contract (setConfig/hass/getCardSize/getStubConfig/getConfigElement).
CardEditor.ts is the visual config form (host/port/title/zone_filter)
using HA's globally-registered ha-textfield. Registers snap-ctrl-card
in window.customCards so it appears in the dashboard's Add Card picker."
```

---

### Task 10: Manual install docs

**Files:**
- Modify: `README.md`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Add an installation section**

Read the current `README.md` structure first (`grep -n "^#" README.md`) to place this section consistently with existing heading levels, then add a new section (e.g. after any existing "Home Assistant Addon" section, or near the end if there's no natural anchor):

```markdown
## Home Assistant Lovelace Card

`snap-ctrl` also ships a standalone Lovelace custom card (`snap-ctrl-card`) for
volume/mute/group controls directly in an HA dashboard — independent of the
HA addon.

### Install

1. Build the card: `pnpm build:card` (or download `snap-ctrl-card.js` from a
   release once published).
2. Copy `dist-card/snap-ctrl-card.js` into your HA config's `www/` folder,
   e.g. `config/www/snap-ctrl-card.js`.
3. In HA, go to **Settings → Dashboards → Resources**, add a new resource:
   - URL: `/local/snap-ctrl-card.js`
   - Resource type: `JavaScript Module`
4. Edit any dashboard, **Add Card → Manual** (or find "Snap Ctrl" in the card
   picker), and configure:

   ```yaml
   type: custom:snap-ctrl-card
   host: 192.168.1.50   # your Snapcast server's host/IP
   port: 1780            # Snapcast control port, default 1780
   title: Whole House Audio   # optional
   zone_filter:                # optional — restrict to specific zones/clients
     - Kitchen
     - Living Room
   ```

The card connects directly to the Snapcast server over WebSocket, the same
protocol the standalone app uses — no HA integration or addon required for
the card itself to work, as long as the Snapcast server is reachable from
your browser.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Lovelace card installation instructions"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-21-lovelace-card-design.md` maps to a task — Architecture/custom-element-contract → Tasks 4, 9; shared WebSocket client extraction → Tasks 1–3; Components → Tasks 5–8; Config editor → Task 9; Data flow/lifecycle → Tasks 6, 8, 9; Theming → Task 8 (CSS custom properties, `ha-card`); Error handling → Tasks 6–8 (`CardConnectionError`, revert-on-failure in `useVolumeControl`); Build & distribution → Tasks 4, 10; Testing → Tasks 1–7 (unit tests), Tasks 8–9 (manual smoke, matching existing no-`.vue`-tests convention).
- **Open follow-ups from the spec** (HACS packaging, client settings/passcode in-card, zone reordering) are intentionally not tasked here — spec marks them explicitly out of scope.
- **Type consistency check:** `CardConfig` is defined once in `CardRoot.vue` (Task 8) and imported by both `SnapCtrlCard.ts` and `CardEditor.ts` (Task 9) rather than redefined — avoids drift. `useCardConnection`'s `request` return type (`Promise<T>`) matches what `useVolumeControl`'s `request` option expects and what `CardZoneGrid`/`CardVolumeRow`/`CardGroupControls` declare as their `request` prop type in Task 8.
