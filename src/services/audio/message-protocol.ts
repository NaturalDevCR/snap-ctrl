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
}

export interface SampleFormat {
  rate: number;
  channels: number;
  bits: number;
}

export interface WireChunk extends BaseMessage {
  type: MessageType.WireChunk;
  timestamp: Timestamp;
  sampleFormat: SampleFormat;
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

  // Snapweb: received @ 6, sent @ 14
  const receivedSec = dv.getInt32(6, true);
  const receivedUsec = dv.getInt32(10, true);
  const sentSec = dv.getInt32(14, true);
  const sentUsec = dv.getInt32(18, true);

  const payloadSize = dv.getUint32(22, true);

  // Read payload
  const payload = new Uint8Array(buffer, 26, payloadSize);

  const baseMsg: BaseMessage = {
    type,
    id,
    refersTo,
    sent: { sec: sentSec, usec: sentUsec },
    received: { sec: receivedSec, usec: receivedUsec },
    size: payloadSize,
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

  // Read header size (4 bytes after codec string)
  const headerSize = pdv.getUint32(4 + codecSize, true);

  // Header payload starts after codec size + codec string + header size
  const startOffset = 4 + codecSize + 4;
  const headerPayload = msg.payload.slice(
    startOffset,
    startOffset + headerSize
  );

  return {
    ...msg,
    type: MessageType.CodecHeader,
    codec: codecStr,
    payload: headerPayload, // Override payload with actual header data
  };
}

/**
 * Parse WireChunk message payload
 * Payload structure (from message.payload):
 * - Bytes 0-3: timestamp.sec
 * - Bytes 4-7: timestamp.usec
 * - Bytes 8-11: payload size (unused, for alignment)
 * - Bytes 12+: encoded audio data
 */
export function parseWireChunk(
  message: BaseMessage,
  sampleFormat: SampleFormat
): WireChunk {
  const dv = new DataView(
    message.payload.buffer,
    message.payload.byteOffset,
    message.payload.byteLength
  );

  const timestampSec = dv.getInt32(0, true);
  const timestampUsec = dv.getInt32(4, true);
  // payloadSize at bytes 8-11 is unused (just for alignment)

  // Audio data starts at byte 12 within the message payload
  const audioPayload = new Uint8Array(
    message.payload.buffer,
    message.payload.byteOffset + 12,
    message.payload.byteLength - 12
  );

  return {
    ...message,
    type: MessageType.WireChunk,
    timestamp: { sec: timestampSec, usec: timestampUsec },
    payload: audioPayload,
    sampleFormat,
  };
}

/**
 * Parse ServerSettings message payload
 */
/**
 * Parse ServerSettings message payload
 */
export function parseServerSettings(msg: BaseMessage): ServerSettings {
  const pdv = new DataView(
    msg.payload.buffer,
    msg.payload.byteOffset,
    msg.payload.byteLength
  );

  // First 4 bytes are bufferMs
  const bufferMs = pdv.getUint32(0, true);

  // The rest is a JSON string
  const jsonBytes = new Uint8Array(
    msg.payload.buffer,
    msg.payload.byteOffset + 4,
    msg.payload.byteLength - 4
  );

  const jsonStr = new TextDecoder().decode(jsonBytes);
  let settings: any = {};

  try {
    settings = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse ServerSettings JSON:", e);
  }

  return {
    ...msg,
    type: MessageType.ServerSettings,
    bufferMs: settings.bufferMs ?? bufferMs,
    latency: settings.latency ?? 0,
    volume: settings.volume ?? 0,
    muted: settings.muted ?? false,
  };
}

/**
 * Build a binary message to send to the Snapserver
 */
export function buildMessage(
  type: MessageType,
  payload: Uint8Array,
  id = 0,
  refersTo = 0,
  sent?: Timestamp
): ArrayBuffer {
  const headerSize = 26;
  const totalSize = headerSize + payload.byteLength;
  const buffer = new ArrayBuffer(totalSize);
  const dv = new DataView(buffer);

  // Set type
  dv.setUint16(0, type, true);
  dv.setUint16(2, id, true);
  dv.setUint16(4, refersTo, true);

  // No padding in packed struct
  // 6-10: received.sec (Note: Snapweb source has received first!)
  // 10-14: received.usec
  // 14-18: sent.sec
  // 18-22: sent.usec
  // 22-26: size (TOTAL size)

  // Set timestamps
  let sec = 0;
  let usec = 0;

  if (sent) {
    sec = sent.sec;
    usec = sent.usec;
  } else {
    const now = Date.now();
    sec = Math.floor(now / 1000);
    usec = (now % 1000) * 1000;
  }

  // Snapweb source: received is at 6, sent is at 14
  // BUT snapweb serialize puts sent at 6 and received at 14!
  // Server expects Client Sent Time at 6.
  dv.setInt32(6, sec, true); // sent.sec
  dv.setInt32(10, usec, true); // sent.usec
  dv.setInt32(14, 0, true); // received.sec
  dv.setInt32(18, 0, true); // received.usec

  // Set TOTAL size
  dv.setUint32(22, totalSize, true);

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
    ID: clientId,
    HostName: hostName,
    Version: "0.6.0",
    ClientName: "Snap-CTRL",
    OS: "web",
    Arch: "web",
    Instance: 1,
    MAC: mac,
    SnapStreamProtocolVersion: 2,
    Auth: { param: "", scheme: "" },
  });

  const jsonBytes = new TextEncoder().encode(helloPayload);

  // Create payload with 4-byte size prefix
  const payloadBuffer = new ArrayBuffer(4 + jsonBytes.length);
  const dv = new DataView(payloadBuffer);
  dv.setUint32(0, jsonBytes.length, true);
  new Uint8Array(payloadBuffer, 4).set(jsonBytes);

  const payload = new Uint8Array(payloadBuffer);

  console.log("Sending Hello Payload (with prefix):", helloPayload);
  return buildMessage(MessageType.Hello, payload);
}

/**
 * Build a Time message for synchronization
 */
export function buildTimeMessage(
  latency: Timestamp,
  sent?: Timestamp,
  id: number = 0
): ArrayBuffer {
  const buffer = new ArrayBuffer(8);
  const dv = new DataView(buffer);

  dv.setUint32(0, latency.sec, true);
  dv.setUint32(4, latency.usec, true);

  const payload = new Uint8Array(buffer);
  return buildMessage(MessageType.Time, payload, id, 0, sent);
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
