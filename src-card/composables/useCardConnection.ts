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
