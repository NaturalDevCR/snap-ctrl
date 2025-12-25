import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "./auth";
import { useSettingsStore } from "./settings";

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

export const useSnapcastStore = defineStore(
  "snapcast",
  () => {
    // Default to current hostname if not localhost, otherwise localhost
    const defaultHost =
      window.location.hostname === "localhost"
        ? "localhost:1780"
        : window.location.host + window.location.pathname.replace(/\/$/, "");
    const host = ref(defaultHost);
    const isConnected = ref(false);
    const isConnecting = ref(false);
    const connectionError = ref<string | null>(null);
    const serverStatus = ref<ServerStatus | null>(null);
    const clients = ref<Client[]>([]);
    const groups = ref<Group[]>([]);
    const streams = ref<Stream[]>([]);
    const websocket = ref<WebSocket | null>(null);
    const requestId = ref(1);

    // Track the browser player's ID to hide its temporary group
    const browserPlayerId = ref<string | null>(
      localStorage.getItem("snapcast-client-id")
    );

    // Get auth store for permission checks
    const auth = useAuthStore();
    const settings = useSettingsStore();

    // Filtered entities based on permissions
    const filteredGroups = computed(() => {
      return auth.filterAllowedEntities("group", groups.value);
    });

    const filteredStreams = computed(() => {
      return auth.filterAllowedEntities("source", streams.value);
    });

    const filteredClients = computed(() => {
      return auth.filterAllowedEntities("client", clients.value);
    });

    // Reconnection state
    const reconnectAttempts = ref(0);
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000; // 1 second
    const maxReconnectDelay = 30000; // 30 seconds
    let reconnectTimeout: number | null = null;
    let manualDisconnect = false;

    const allClients = computed(() => {
      if (!serverStatus.value) return [];
      return serverStatus.value.server.groups.flatMap((group) => group.clients);
    });

    const connectedClients = computed(() => {
      return allClients.value.filter((client) => client.connected);
    });

    function setHost(newHost: string) {
      // Strip protocol if present to avoid double protocol in connection URL
      // Also strip trailing slash to avoid double slashes in path
      const cleanHost = newHost
        .replace(/^https?:\/\//, "")
        .replace(/^wss?:\/\//, "")
        .replace(/\/$/, "");
      host.value = cleanHost;
    }

    function getReconnectDelay(): number {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
      const delay = Math.min(
        baseReconnectDelay * Math.pow(2, reconnectAttempts.value),
        maxReconnectDelay
      );
      return delay;
    }

    function scheduleReconnect() {
      if (manualDisconnect || reconnectAttempts.value >= maxReconnectAttempts) {
        if (reconnectAttempts.value >= maxReconnectAttempts) {
          connectionError.value =
            "Maximum reconnection attempts reached. Please check your server and try again manually.";
        }
        return;
      }

      const delay = getReconnectDelay();
      console.log(
        `Reconnecting in ${delay}ms (attempt ${
          reconnectAttempts.value + 1
        }/${maxReconnectAttempts})...`
      );

      reconnectTimeout = window.setTimeout(() => {
        reconnectAttempts.value++;
        connect();
      }, delay);
    }

    function connect() {
      if (websocket.value?.readyState === WebSocket.OPEN) {
        return;
      }

      // Clear any pending reconnection
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      manualDisconnect = false;
      isConnecting.value = true;
      connectionError.value = null;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${host.value}/jsonrpc`;
      console.log(`Connecting to ${wsUrl}...`);

      try {
        websocket.value = new WebSocket(wsUrl);
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        connectionError.value = "Failed to create WebSocket connection";
        isConnecting.value = false;
        scheduleReconnect();
        return;
      }

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (websocket.value?.readyState === WebSocket.CONNECTING) {
          console.error("Connection timeout");
          connectionError.value = "Connection timeout";
          websocket.value.close();
          isConnecting.value = false;
          scheduleReconnect();
        }
      }, 10000); // 10 second timeout

      websocket.value.onopen = () => {
        clearTimeout(connectionTimeout);
        isConnected.value = true;
        isConnecting.value = false;
        connectionError.value = null;
        reconnectAttempts.value = 0; // Reset on successful connection
        console.log("Connected to Snapcast server");
        getServerStatus();
      };

      websocket.value.onclose = (event) => {
        clearTimeout(connectionTimeout);
        isConnected.value = false;
        isConnecting.value = false;

        const wasClean = event.wasClean;
        const code = event.code;
        const reason = event.reason || "Unknown reason";

        console.log(
          `Disconnected from Snapcast server (clean: ${wasClean}, code: ${code}, reason: ${reason})`
        );

        if (!manualDisconnect) {
          connectionError.value = `Connection lost: ${reason}`;
          scheduleReconnect();
        }
      };

      websocket.value.onerror = (error) => {
        console.error("WebSocket error:", error);
        connectionError.value = "WebSocket connection error";
        isConnecting.value = false;
        // The onclose handler will handle reconnection
      };

      websocket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };
    }

    function disconnect() {
      manualDisconnect = true;
      reconnectAttempts.value = 0;

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      if (websocket.value) {
        websocket.value.close();
        websocket.value = null;
      }

      isConnected.value = false;
      isConnecting.value = false;
      connectionError.value = null;
    }

    function sendRequest(method: string, params?: any): Promise<any> {
      return new Promise((resolve, reject) => {
        if (!websocket.value || websocket.value.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        const id = requestId.value++;
        const message = {
          id,
          jsonrpc: "2.0",
          method,
          ...(params && { params }),
        };

        const timeout = setTimeout(() => {
          reject(new Error("Request timeout"));
        }, 5000);

        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.id === id) {
              websocket.value?.removeEventListener("message", messageHandler);
              clearTimeout(timeout);
              if (data.error) {
                reject(new Error(data.error.message));
              } else {
                resolve(data.result);
              }
            }
          } catch (error) {
            console.error("Failed to parse response:", error);
          }
        };

        websocket.value.addEventListener("message", messageHandler);
        websocket.value.send(JSON.stringify(message));
      });
    }

    function handleMessage(data: any) {
      if (data.method) {
        // Handle notifications
        switch (data.method) {
          case "Client.OnVolumeChanged":
            // PER-SOURCE VOLUME: Auto-save disabled in favor of manual snapshot
            break;
          case "Client.OnConnect":
          case "Client.OnDisconnect":
          case "Client.OnNameChanged":
          case "Group.OnStreamChanged":
          case "Group.OnMute":
            // Refresh server status when clients change
            getServerStatus();
            break;
          case "Stream.OnUpdate":
            // Update specific stream
            if (data.params?.stream) {
              const updatedStream = data.params.stream;
              const index = streams.value.findIndex(
                (s) => s.id === updatedStream.id
              );
              if (index !== -1) {
                streams.value[index] = updatedStream;
              } else {
                streams.value.push(updatedStream);
              }
            }
            break;
        }
      } else if (data.result) {
        // Handle responses
        if (data.id === 1) {
          // Server.GetStatus response
          serverStatus.value = data.result;
          updateLocalState();
        }
      }
    }

    function updateLocalState() {
      if (serverStatus.value) {
        groups.value = serverStatus.value.server.groups;
        streams.value = serverStatus.value.server.streams;
        clients.value = allClients.value;
      }
    }

    async function getServerStatus() {
      try {
        const result = await sendRequest("Server.GetStatus");
        serverStatus.value = result;
        updateLocalState();
      } catch (error) {
        console.error("Failed to get server status:", error);
      }
    }

    async function setClientVolume(
      clientId: string,
      volume: number,
      mute = false
    ) {
      // Check permission
      if (!auth.hasFeaturePermission("canAdjustVolumes")) {
        console.warn("Permission denied: Cannot adjust volumes");
        return;
      }
      if (!auth.isEntityAllowed("client", clientId)) {
        console.warn("Permission denied: Client not allowed");
        return;
      }

      const cl = findClientById(clientId);
      if (cl) {
        // Optimization: Don't send request if values are identical
        if (
          cl.config.volume.percent === volume &&
          cl.config.volume.muted === mute
        ) {
          return;
        }
      }

      // Optimistic update to remove UI lag
      const previous = cl ? { ...cl.config.volume } : null;
      if (cl) {
        cl.config.volume.percent = Math.max(0, Math.min(100, volume));
        cl.config.volume.muted = !!mute;
      }
      try {
        await sendRequest("Client.SetVolume", {
          id: clientId,
          volume: {
            percent: Math.max(0, Math.min(100, volume)),
            muted: mute,
          },
        });
      } catch (error) {
        console.error("Failed to set client volume:", error);
        // Revert on failure
        if (cl && previous) {
          cl.config.volume = previous;
        }
      }
    }

    async function setClientName(clientId: string, name: string) {
      // Check permission
      if (!auth.hasFeaturePermission("canRenameClients")) {
        console.warn("Permission denied: Cannot rename clients");
        return;
      }
      if (!auth.isEntityAllowed("client", clientId)) {
        console.warn("Permission denied: Client not allowed");
        return;
      }

      // Optimistic update
      const cl = findClientById(clientId);
      const prev = cl ? cl.config.name : null;
      if (cl) cl.config.name = name;
      try {
        await sendRequest("Client.SetName", {
          id: clientId,
          name,
        });
      } catch (error) {
        console.error("Failed to set client name:", error);
        if (cl && prev !== null) cl.config.name = prev;
      }
    }

    /**
     * Set client latency in milliseconds using optimistic update.
     */
    async function setClientLatency(clientId: string, latencyMs: number) {
      const cl = findClientById(clientId);
      const prev = cl ? cl.config.latency : null;
      if (cl) cl.config.latency = latencyMs;
      try {
        await sendRequest("Client.SetLatency", {
          id: clientId,
          latency: latencyMs,
        });
      } catch (error) {
        console.error("Failed to set client latency:", error);
        if (cl && prev !== null) cl.config.latency = prev;
      }
    }

    async function setGroupMute(groupId: string, mute: boolean) {
      // Check permission
      if (!auth.hasFeaturePermission("canAdjustVolumes")) {
        console.warn("Permission denied: Cannot adjust volumes");
        return;
      }
      if (!auth.isEntityAllowed("group", groupId)) {
        console.warn("Permission denied: Group not allowed");
        return;
      }

      const g = groups.value.find((g) => g.id === groupId);
      const prev = g ? g.muted : null;
      if (g) g.muted = mute;
      try {
        await sendRequest("Group.SetMute", {
          id: groupId,
          mute,
        });
      } catch (error) {
        console.error("Failed to set group mute:", error);
        if (g && prev !== null) g.muted = prev;
      }
    }

    async function setGroupStream(groupId: string, streamId: string) {
      const g = groups.value.find((g) => g.id === groupId);
      const prev = g ? g.stream_id : null;
      if (!g) return;

      const isEnabled = settings.isPerSourceVolumeEnabled(groupId);
      console.log(`[SnapCtrl] Switching Group ${g.name} stream: ${prev} -> ${streamId}. PSV Enabled: ${isEnabled}`);

      // Optimistic update
      g.stream_id = streamId;

      try {
        await sendRequest("Group.SetStream", {
          id: groupId,
          stream_id: streamId,
        });

        // PER-SOURCE VOLUME: Restore volumes for the NEW stream if available
        if (settings.isPerSourceVolumeEnabled(groupId)) {
          const groupClients = g.clients;
          
          // Use Promise.all to send requests in parallel instead of sequentially
          await Promise.all(groupClients.map(async (client) => {
            if (!client.connected) return;

            const savedVolume = settings.getClientVolume(client.id, streamId);
            console.log(`[SnapCtrl] Checking restore: Client=${client.id}, Stream=${streamId}, SavedVol=${savedVolume}`);
            if (savedVolume !== undefined) {
              // Apply saved volume
              console.log(`[SnapCtrl] Restoring volume: Client=${client.id}, Vol=${savedVolume}%`);
              await setClientVolume(client.id, savedVolume, client.config.volume.muted);
            }
          }));
        }
      } catch (error) {
        console.error("Failed to set group stream:", error);
        if (g && prev !== null) g.stream_id = prev;
      }
    }

    /**
     * Set the list of client ids for a group using Group.SetClients.
     * Optimistically updates local group structure order to match provided ids.
     */
    async function setGroupClients(groupId: string, clientIds: string[]) {
      const g = groups.value.find((g) => g.id === groupId);
      const prevClients = g ? [...g.clients] : null;
      if (g) {
        // Optimistically reorder/filter clients
        const idToClient = new Map(g.clients.map((c) => [c.id, c]));
        g.clients = clientIds
          .map((id) => idToClient.get(id))
          .filter(Boolean) as Client[];
      }
      try {
        await sendRequest("Group.SetClients", {
          id: groupId,
          clients: clientIds,
        });
      } catch (error) {
        console.error("Failed to set group clients:", error);
        if (g && prevClients) g.clients = prevClients;
      }
    }

    async function setGroupName(groupId: string, name: string) {
      // Check permission
      if (!auth.hasFeaturePermission("canRenameGroups")) {
        console.warn("Permission denied: Cannot rename groups");
        return;
      }
      if (!auth.isEntityAllowed("group", groupId)) {
        console.warn("Permission denied: Group not allowed");
        return;
      }

      const g = groups.value.find((g) => g.id === groupId);
      const prev = g ? g.name : null;
      if (g) g.name = name;
      try {
        await sendRequest("Group.SetName", {
          id: groupId,
          name,
        });
      } catch (error) {
        console.error("Failed to set group name:", error);
        if (g && prev !== null) g.name = prev;
      }
    }

    /**
     * Delete a client from the server.
     * This will automatically clean up any empty groups.
     * Used primarily for cleaning up browser player orphaned groups.
     */
    async function deleteClient(clientId: string) {
      try {
        await sendRequest("Server.DeleteClient", {
          id: clientId,
        });
        console.log(`Client ${clientId} deleted successfully`);
        // Refresh server status after deletion
        await getServerStatus();
      } catch (error) {
        console.error("Failed to delete client:", error);
        throw error;
      }
    }

    /**
     * Set group volume additively for linked clients.
     * Adjusts all linked clients by the same delta from their reference volumes.
     * Example: If group volume changes -1%, each client volume changes -1%.
     * @param groupId - ID of the group
     * @param groupVolume - Target group volume percentage (0-100)
     * @param linkedClientIds - IDs of clients to adjust
     * @param referenceVolumes - Reference volumes (baseline) for each client
     */
    async function setGroupVolumeProportional(
      groupId: string,
      groupVolume: number,
      linkedClientIds: string[],
      referenceVolumes: Record<string, number>
    ) {
      const group = groups.value.find((g) => g.id === groupId);
      if (!group) return;

      // Get linked clients
      const linkedClients = group.clients.filter((c) =>
        linkedClientIds.includes(c.id)
      );

      if (linkedClients.length === 0) return;

      // Calculate average reference volume (the "100%" baseline for the group)
      const refVolumes = linkedClients
        .map(
          (client) =>
            referenceVolumes[client.id] ?? client.config.volume.percent
        )
        .filter((v) => v !== undefined);

      if (refVolumes.length === 0) return;

      const avgRefVolume =
        refVolumes.reduce((sum, v) => sum + v, 0) / refVolumes.length;

      // Calculate delta from baseline
      // If avgRefVolume was 70% and groupVolume is now 69%, delta = -1%
      const delta = groupVolume - avgRefVolume;

      // Apply the same delta to each linked client
      const promises = linkedClients.map((client) => {
        const refVolume =
          referenceVolumes[client.id] ?? client.config.volume.percent;

        // Add delta to reference volume
        // Example: client ref 80%, delta -1% → newVolume = 79%
        const newVolume = Math.round(
          Math.min(100, Math.max(0, refVolume + delta))
        );

        return setClientVolume(
          client.id,
          newVolume,
          client.config.volume.muted
        );
      });

      // Execute all volume changes concurrently
      await Promise.all(promises);
    }

    /**
     * Find a client by id across all groups and return a live reference.
     */
    function findClientById(clientId: string): Client | null {
      for (const g of groups.value) {
        const cl = g.clients.find((c) => c.id === clientId);
        if (cl) return cl;
      }
      return null;
    }

    function setBrowserPlayerId(id: string | null) {
      browserPlayerId.value = id;
    }

    return {
      host,
      browserPlayerId,
      isConnected,
      isConnecting,
      connectionError,
      serverStatus,
      clients,
      groups,
      streams,
      filteredGroups,
      filteredStreams,
      filteredClients,
      allClients,
      connectedClients,
      setHost,
      connect,
      disconnect,
      getServerStatus,
      setClientVolume,
      setClientName,
      setClientLatency,
      setGroupMute,
      setGroupStream,
      setGroupClients,
      setGroupName,
      deleteClient,
      setGroupVolumeProportional,
      findClientById,
      setBrowserPlayerId,
    };
  },
  {
    persist: {
      key: "snapcast-store",
      pick: ["host"],
    },
  }
);
