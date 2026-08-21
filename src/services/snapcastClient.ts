import type { SnapcastInboundMessage } from "@/types/snapcast-rpc";

export type SnapcastClientStatus = "disconnected" | "connecting" | "connected";

export interface SnapcastClientOptions {
  url: string;
  requestTimeoutMs?: number;
  connectTimeoutMs?: number;
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
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_BASE_RECONNECT_DELAY_MS = 1000;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

export function createSnapcastClient(
  options: SnapcastClientOptions
): SnapcastClient {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
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
  let connectTimeout: ReturnType<typeof setTimeout> | null = null;

  const eventHandlers = new Set<(msg: SnapcastInboundMessage) => void>();
  const statusHandlers = new Set<
    (status: SnapcastClientStatus, error: string | null) => void
  >();

  function setStatus(next: SnapcastClientStatus, error: string | null = null) {
    status = next;
    lastError = error;
    for (const handler of statusHandlers) handler(next, error);
  }

  function clearConnectTimeout() {
    if (connectTimeout) {
      clearTimeout(connectTimeout);
      connectTimeout = null;
    }
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
    clearConnectTimeout();

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

    // A socket stuck in CONNECTING (e.g. an unreachable-but-routable host)
    // has no bound on how long the OS-level TCP handshake can take — it
    // can exceed a minute. Force it closed after connectTimeoutMs so the
    // client errors out and reconnects on a predictable schedule instead.
    connectTimeout = setTimeout(() => {
      connectTimeout = null;
      const stalled = websocket;
      if (stalled && stalled.readyState === WebSocket.CONNECTING) {
        // Detach handlers before closing so the normal onclose path (which
        // reports "Connection lost") doesn't also run for this socket —
        // we report the timeout ourselves and drive scheduleReconnect()
        // directly, same as any other unexpected close.
        stalled.onopen = null;
        stalled.onclose = null;
        stalled.onerror = null;
        stalled.onmessage = null;
        stalled.close();
        if (websocket === stalled) websocket = null;
        setStatus("disconnected", "Connection timeout");
        scheduleReconnect();
      }
    }, connectTimeoutMs);

    websocket.onopen = () => {
      clearConnectTimeout();
      hasConnectedSuccessfully = true;
      reconnectAttempts = 0;
      setStatus("connected");
    };

    websocket.onclose = (event) => {
      clearConnectTimeout();
      const wasManual = manualDisconnect;
      websocket = null;
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
    clearConnectTimeout();
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
