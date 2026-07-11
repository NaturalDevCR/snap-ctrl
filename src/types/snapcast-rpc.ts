/**
 * Types for the Snapcast JSON-RPC control protocol.
 * https://github.com/badaix/snapcast/blob/develop/doc/json_rpc_api/control.md
 */
import type { Client, Group, ServerStatus, Stream } from "@/stores/snapcast";

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

/** Result shape of mutating RPCs that echo the full server status
 * (Server.DeleteClient, Group.SetClients). */
export interface ServerStatusResult {
  server?: ServerStatus["server"];
}

interface Notification<M extends string, P> {
  jsonrpc: "2.0";
  method: M;
  params: P;
}

export type ClientOnConnect = Notification<
  "Client.OnConnect",
  { id: string; client: Client }
>;
export type ClientOnDisconnect = Notification<
  "Client.OnDisconnect",
  { id: string; client: Client }
>;
export type ClientOnVolumeChanged = Notification<
  "Client.OnVolumeChanged",
  { id: string; volume: { muted: boolean; percent: number } }
>;
export type ClientOnLatencyChanged = Notification<
  "Client.OnLatencyChanged",
  { id: string; latency: number }
>;
export type ClientOnNameChanged = Notification<
  "Client.OnNameChanged",
  { id: string; name: string }
>;
export type GroupOnMute = Notification<
  "Group.OnMute",
  { id: string; mute: boolean }
>;
export type GroupOnStreamChanged = Notification<
  "Group.OnStreamChanged",
  { id: string; stream_id: string }
>;
export type GroupOnNameChanged = Notification<
  "Group.OnNameChanged",
  { id: string; name: string }
>;
export type StreamOnUpdate = Notification<
  "Stream.OnUpdate",
  { id: string; stream: Stream }
>;
export type StreamOnProperties = Notification<
  "Stream.OnProperties",
  { id: string; properties: Record<string, unknown> }
>;
export type ServerOnUpdate = Notification<
  "Server.OnUpdate",
  { server: ServerStatus["server"] }
>;

export type SnapcastNotification =
  | ClientOnConnect
  | ClientOnDisconnect
  | ClientOnVolumeChanged
  | ClientOnLatencyChanged
  | ClientOnNameChanged
  | GroupOnMute
  | GroupOnStreamChanged
  | GroupOnNameChanged
  | StreamOnUpdate
  | StreamOnProperties
  | ServerOnUpdate;

/** Any inbound message on the control socket. */
export type SnapcastInboundMessage = JsonRpcResponse | SnapcastNotification;

export type { Client, Group, ServerStatus, Stream };
