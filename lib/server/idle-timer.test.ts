import { describe, expect, it } from "vitest";
import { decideIdleAction } from "./idle-timer";

describe("decideIdleAction", () => {
  it("does nothing before the configured timeout, first offense", () => {
    expect(decideIdleAction({ elapsedMs: 14_999, missedTurnsInRow: 0, stillThereTimeoutSec: 15 })).toBe("none");
  });

  it("auto-plays once the full timeout elapses, first offense", () => {
    expect(decideIdleAction({ elapsedMs: 15_000, missedTurnsInRow: 0, stillThereTimeoutSec: 15 })).toBe("autoPlay");
  });

  it("does nothing before the 5s popup window on a second consecutive miss", () => {
    expect(decideIdleAction({ elapsedMs: 4_999, missedTurnsInRow: 1, stillThereTimeoutSec: 15 })).toBe("none");
  });

  it("converts the seat to a bot once the shorter popup-only window elapses", () => {
    expect(decideIdleAction({ elapsedMs: 5_000, missedTurnsInRow: 1, stillThereTimeoutSec: 15 })).toBe("convertToBot");
  });

  it("still converts to a bot on a 3rd+ consecutive miss, not another auto-play", () => {
    expect(decideIdleAction({ elapsedMs: 5_000, missedTurnsInRow: 2, stillThereTimeoutSec: 15 })).toBe("convertToBot");
  });

  it("respects a custom configured timeout", () => {
    expect(decideIdleAction({ elapsedMs: 9_999, missedTurnsInRow: 0, stillThereTimeoutSec: 10 })).toBe("none");
    expect(decideIdleAction({ elapsedMs: 10_000, missedTurnsInRow: 0, stillThereTimeoutSec: 10 })).toBe("autoPlay");
  });

  it("never shrinks the popup window below 5s even for a very short configured timeout", () => {
    // A 5s configured timeout would leave 0s of invisible wait, still a full 5s popup.
    expect(decideIdleAction({ elapsedMs: 4_999, missedTurnsInRow: 0, stillThereTimeoutSec: 5 })).toBe("none");
    expect(decideIdleAction({ elapsedMs: 5_000, missedTurnsInRow: 0, stillThereTimeoutSec: 5 })).toBe("autoPlay");
  });
});
