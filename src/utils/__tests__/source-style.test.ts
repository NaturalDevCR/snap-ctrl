import { describe, expect, it } from "vitest";
import {
  getSourceAccent,
  getSourceHue,
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

describe("getSourceHue", () => {
  it("is stable and within 0-359", () => {
    const s = { id: "a", uri: "pipe:///tmp/x?name=Spotify" };
    const hue = getSourceHue(s);
    expect(hue).toBe(getSourceHue({ ...s }));
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it("differs between differently named sources", () => {
    expect(getSourceHue({ id: "a", uri: "pipe:///x?name=Spotify" })).not.toBe(
      getSourceHue({ id: "b", uri: "pipe:///x?name=Radio" })
    );
  });
});

describe("getSourceAccent", () => {
  it("darkens light hues so white text stays readable", () => {
    expect(getSourceAccent(60).main).toBe("hsl(60 78% 40%)");
    expect(getSourceAccent(220).main).toBe("hsl(220 78% 50%)");
  });
});
