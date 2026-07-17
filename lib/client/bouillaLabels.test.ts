import { describe, expect, it } from "vitest";
import { ROUND_ORDER } from "@/lib/bouilla";
import { ROUND_LABEL, ROUND_PENALTY_LABEL } from "@/components/bouillaLabels";

describe("Bouilla English labels", () => {
  it("translates every round", () => {
    expect(ROUND_ORDER.map((round) => ROUND_LABEL.en[round])).toEqual([
      "No tricks",
      "No clubs",
      "No queens",
      "No king of spades",
      "No last trick",
      "Everything",
    ]);
  });

  it("provides an English penalty label for every round", () => {
    expect(ROUND_ORDER.map((round) => ROUND_PENALTY_LABEL.en[round])).toEqual([
      "5 pts / trick",
      "10 pts / club",
      "20 pts / queen",
      "50 pts",
      "100 pts",
      "All 5 rules combined",
    ]);
  });
});
