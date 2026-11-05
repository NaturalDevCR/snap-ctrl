import { describe, expect, it } from "vitest";
import {
  getSourceIcon,
  getStreamScheme,
} from "@/utils/source-style";

describe("getStreamScheme", () => {
  it("reads the scheme from string URIs", () => {
    expect(getStreamScheme({ id: "a", uri: "pipe:///tmp/fifo?name=Main" })).toBe("pipe");
  });

  it("reads the scheme from parsed URI objects", () => {
    expect(getStreamScheme({ id: "a", uri: { scheme: "Librespot" } })).toBe("librespot");
  });

  it("returns an empty string when unknown", () => {
    expect(getStreamScheme({ id: "a" })).toBe("");
    expect(getStreamScheme(null)).toBe("");
  });
});

describe("getSourceIcon", () => {
  it("recognizes common sources by scheme or name", () => {
    expect(getSourceIcon({ id: "a", uri: { scheme: "librespot", query: { name: "Kitchen" } } })).toBe("mdi-spotify");
    expect(getSourceIcon({ id: "a", uri: "pipe:///tmp/x?name=Spotify" })).toBe("mdi-spotify");
    expect(getSourceIcon({ id: "a", uri: "airplay:///shairport?name=Guests" })).toBe("mdi-cast-audio");
    expect(getSourceIcon({ id: "a", uri: "pipe:///tmp/x?name=Radio" })).toBe("mdi-radio");
  });

  it("falls back to a generic music icon", () => {
    expect(getSourceIcon({ id: "a", uri: "pipe:///tmp/x?name=Default" })).toBe("mdi-music-note");
    expect(getSourceIcon(undefined)).toBe("mdi-music-note");
  });
});
