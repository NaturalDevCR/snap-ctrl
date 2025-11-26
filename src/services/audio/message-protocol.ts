/**
 * Binary message protocol for Snapserver stream endpoint
 * Based on Snapweb's implementation
 */

export enum MessageType {
  Base = 0,
  CodecHeader = 1,
  WireChunk = 2,
  ServerSettings = 3,
  Time = 4,
  Hello = 5,
}

export interface Timestamp {
  sec: number;
  usec: number;
}

export interface BaseMessage {
  type: MessageType;
  id: number;
  refersTo: number;
  sent: Timestamp;
  received: Timestamp;
  size: number;
  payload: Uint8Array;
}

export interface CodecHeader extends BaseMessage {
  type: MessageType.CodecHeader;
  codec: string;
  codecPayload: Uint8Array;
}

export interface WireChunk extends BaseMessage {
  type: MessageType.WireChunk;
  timestamp: Timestamp;
}

export interface ServerSettings extends BaseMessage {
  type: MessageType.ServerSettings;
  bufferMs: number;
  latency: number;
  volume: number;
  muted: boolean;
}

export interface TimeMessage extends BaseMessage {
  type: MessageType.Time;
  latency: Timestamp;
}

export interface HelloMessage extends BaseMessage {
  type: MessageType.Hello;
  clientName: string;
  hostName: string;
  os: string;
  version: string;
  clientId: string;
  instance: number;
}

/**
 * Parse a binary message from the Snapserver
 */
export function parseMessage(buffer: ArrayBuffer): BaseMessage {
  const dv = new DataView(buffer);

  // Read header (26 bytes)
  const type = dv.getUint16(0, true);
  const id = dv.getUint16(2, true);
  const refersTo = dv.getUint16(4, true);

  const sentSec = dv.getUint32(8, true);
  const sentUsec = dv.getUint32(12, true);
  const receivedSec = dv.getUint32(16, true);
  const receivedUsec = dv.getUint32(20, true);

  const size = dv.getUint32(24, true);

  // Read payload
  const payload = new Uint8Array(buffer, 26, size);

  const baseMsg: BaseMessage = {
    type,
    id,
    refersTo,
    sent: { sec: sentSec, usec: sentUsec },
    received: { sec: receivedSec, usec: receivedUsec },
    size,
    payload,
  };

  return baseMsg;
}

/**
 * Parse CodecHeader message payload
 */
export function parseCodecHeader(msg: BaseMessage): CodecHeader {
  const pdv = new DataView(
    msg.payload.buffer,
    msg.payload.byteOffset,
    msg.payload.byteLength
  );

  const codecSize = pdv.getUint32(0, true);
  const codecStr = new TextDecoder().decode(
    msg.payload.slice(4, 4 + codecSize)
  );
  const codecPayload = msg.payload.slice(4 + codecSize);

  return {
    ...msg,
    type: MessageType.CodecHeader,
    codec: codecStr,
    codecPayload,
  };
}

/**
 * Parse WireChunk message payload
 */
export function parseWireChunk(msg: BaseMessage): WireChunk {
  const pdv = new DataView(
    msg.payload.buffer,
    msg.payload.byteOffset,
    msg.payload.byteLength
  );

  const timestampSec = pdv.getUint32(0, true);
  const timestampUsec = pdv.getUint32(4, true);

  return {
    ...msg,
    type: MessageType.WireChunk,
    timestamp: { sec: timestampSec, usec: timestampUsec },
  };
}

/**
 * Parse ServerSettings message payload
 */
export function parseServerSettings(msg: BaseMessage): ServerSettings {
  const pdv = new DataView(
    msg.payload.buffer,
    msg.payload.byteOffset,
    msg.payload.byteLength
  );

  const bufferMs = pdv.getUint32(0, true);
  const latency = pdv.getInt32(4, true);
  const volume = pdv.getUint32(8, true);
  const muted = pdv.getUint16(12, true) !== 0;

  return {
    ...msg,
    type: MessageType.ServerSettings,
    bufferMs,
    latency,
    volume,
    muted,
  };
}

/**
 * Build a binary message to send to the Snapserver
 */
export function buildMessage(
  type: MessageType,
  payload: Uint8Array,
  id = 0,
  refersTo = 0
): ArrayBuffer {
  const headerSize = 26;
  const buffer = new ArrayBuffer(headerSize + payload.byteLength);
  const dv = new DataView(buffer);

  // Set type
  dv.setUint16(0, type, true);
  dv.setUint16(2, id, true);
  dv.setUint16(4, refersTo, true);
  dv.setUint16(6, 0, true); // reserved

  // Set timestamps
  const now = Date.now();
  const sec = Math.floor(now / 1000);
  const usec = (now % 1000) * 1000;

  dv.setUint32(8, sec, true); // sent.sec
  dv.setUint32(12, usec, true); // sent.usec
  dv.setUint32(16, sec, true); // received.sec
  dv.setUint32(20, usec, true); // received.usec

  // Set payload size
  dv.setUint32(24, payload.byteLength, true);

  // Copy payload
  new Uint8Array(buffer, headerSize).set(payload);

  return buffer;
}

/**
 * Build a Hello message
 */
export function buildHelloMessage(
  clientName: string,
  hostName: string,
  clientId: string,
  mac: string = "00:00:00:00:00:00"
): ArrayBuffer {
  const helloPayload = JSON.stringify({
    Arch: "web",
    ClientName: clientName,
    HostName: hostName,
    ID: clientId,
    Instance: 1,
    MAC: mac,
    OS: navigator.platform,
    SnapStreamProtocolVersion: 2,
    Version: "web-1.0",
  });

  const payload = new TextEncoder().encode(helloPayload);
  return buildMessage(MessageType.Hello, payload);
}

/**
 * Build a Time message for synchronization
 */
export function buildTimeMessage(latency: Timestamp): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const dv = new DataView(buffer);

  dv.setUint32(0, latency.sec, true);
  dv.setUint32(4, latency.usec, true);

  const payload = new Uint8Array(buffer);
  return buildMessage(MessageType.Time, payload);
}

/**
 * Convert timestamp to milliseconds
 */
export function timestampToMs(ts: Timestamp): number {
  return ts.sec * 1000 + ts.usec / 1000;
}

/**
 * Convert milliseconds to timestamp
 */
export function msToTimestamp(ms: number): Timestamp {
  return {
    sec: Math.floor(ms / 1000),
    usec: (ms % 1000) * 1000,
  };
}
