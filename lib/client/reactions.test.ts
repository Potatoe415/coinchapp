import { describe, expect, it } from "vitest";
import { parseReactionPayload } from "./reactions";

const gifUrl = "https://media.giphy.com/media/abc/giphy.gif";

describe("parseReactionPayload", () => {
  it("accepts a legacy emoji broadcast", () => {
    expect(parseReactionPayload({ seat: 2, emoji: "😂" })).toEqual({
      seat: 2,
      pick: { kind: "emoji", emoji: "😂" },
    });
  });

  it("accepts a Giphy GIF broadcast", () => {
    expect(parseReactionPayload({ seat: 0, kind: "gif", gifUrl })).toEqual({
      seat: 0,
      pick: { kind: "gif", gifUrl },
    });
  });

  it("rejects a GIF from a non-Giphy host", () => {
    expect(
      parseReactionPayload({ seat: 1, kind: "gif", gifUrl: "https://evil.example/x.gif" }),
    ).toBeNull();
  });

  it("rejects an out-of-range seat", () => {
    expect(parseReactionPayload({ seat: 4, emoji: "🔥" })).toBeNull();
  });
});
