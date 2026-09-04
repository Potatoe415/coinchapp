import { describe, expect, it } from "vitest";
import { isGiphyMediaUrl, mapGiphyItems } from "./gifs";

describe("isGiphyMediaUrl", () => {
  it("accepts https Giphy CDN hosts", () => {
    expect(isGiphyMediaUrl("https://media.giphy.com/media/abc/giphy.gif")).toBe(true);
    expect(isGiphyMediaUrl("https://media3.giphy.com/media/abc/200w.webp")).toBe(true);
    expect(isGiphyMediaUrl("https://i.giphy.com/media/abc/giphy.gif")).toBe(true);
  });

  it("rejects non-https, other hosts, and junk", () => {
    expect(isGiphyMediaUrl("http://media.giphy.com/media/abc/giphy.gif")).toBe(false);
    expect(isGiphyMediaUrl("https://evil.com/x.gif")).toBe(false);
    expect(isGiphyMediaUrl("https://media.giphy.com.evil.com/x.gif")).toBe(false);
    expect(isGiphyMediaUrl("not a url")).toBe(false);
  });
});

describe("mapGiphyItems", () => {
  const giphyGif = "https://media.giphy.com/media/abc/giphy.gif";
  const giphyWebp = "https://media1.giphy.com/media/abc/200.webp";

  it("maps search hits and prefers webp", () => {
    const hits = mapGiphyItems([
      {
        id: "abc",
        title: "cat",
        images: {
          fixed_height: { url: giphyGif, webp: giphyWebp },
          fixed_height_small: { url: giphyGif },
        },
      },
    ]);
    expect(hits).toEqual([
      { id: "abc", title: "cat", previewUrl: giphyGif, url: giphyWebp },
    ]);
  });

  it("drops items with non-Giphy image hosts", () => {
    expect(
      mapGiphyItems([
        {
          id: "evil",
          images: { fixed_height: { url: "https://evil.example/x.gif" } },
        },
      ]),
    ).toEqual([]);
  });

  it("ignores a non-array payload", () => {
    expect(mapGiphyItems({ id: "nope" })).toEqual([]);
  });
});
