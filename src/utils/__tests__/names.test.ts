import { describe, expect, it } from "vitest";
import { getStreamName } from "@/utils/stream-name";
import { getGroupDisplayName } from "@/utils/group-name";

describe("getStreamName", () => {
  it("returns the id when uri is missing", () => {
    expect(getStreamName({ id: "s1" })).toBe("s1");
  });

  it("returns the id when stream is null", () => {
    expect(getStreamName(null)).toBe("Unknown Stream");
  });

  it("parses string URI with query", () => {
    expect(
      getStreamName({ id: "s1", uri: "pipe:///tmp/snapfifo?name=Living%20Room" })
    ).toBe("Living Room");
  });

  it("falls back to raw URI when no name in query", () => {
    expect(
      getStreamName({ id: "s1", uri: "pipe:///tmp/snapfifo?codec=flac" })
    ).toBe("pipe:///tmp/snapfifo?codec=flac");
  });

  it("parses object URI with string query", () => {
    expect(
      getStreamName({
        id: "s1",
        uri: { path: "/foo", query: "name=Spotify&codec=flac" },
      })
    ).toBe("Spotify");
  });

  it("parses object URI with object query", () => {
    expect(
      getStreamName({
        id: "s1",
        uri: { path: "/foo", query: { name: "AirPlay" } },
      })
    ).toBe("AirPlay");
  });

  it("falls back to path when no name in object query", () => {
    expect(
      getStreamName({
        id: "s1",
        uri: { path: "/tmp/snapfifo" },
      })
    ).toBe("/tmp/snapfifo");
  });
});

describe("getGroupDisplayName", () => {
  const streams = [
    { id: "st1", uri: "pipe:///tmp/snapfifo?name=Kitchen" },
  ];

  it("prefers the group custom name", () => {
    expect(
      getGroupDisplayName(
        { id: "g1", name: "My Group", stream_id: "st1", clients: [] },
        streams
      )
    ).toBe("My Group");
  });

  it("falls back to the stream name", () => {
    expect(
      getGroupDisplayName(
        { id: "g1", name: "", stream_id: "st1", clients: [] },
        streams
      )
    ).toBe("Kitchen");
  });

  it("falls back to first client name with ' Group' suffix", () => {
    expect(
      getGroupDisplayName(
        {
          id: "g1",
          name: "",
          stream_id: "",
          clients: [{ config: { name: "Speaker" } }],
        },
        []
      )
    ).toBe("Speaker Group");
  });

  it("falls back to client count when no client names", () => {
    expect(
      getGroupDisplayName(
        {
          id: "g1",
          name: "",
          stream_id: "",
          clients: [{}, {}, {}],
        },
        []
      )
    ).toBe("3 Clients");
  });

  it("falls back to truncated id when group is empty", () => {
    expect(getGroupDisplayName({ id: "abc123def456", name: "" }, [])).toBe(
      "Group abc123de"
    );
  });
});
