/**
 * coaching.spec.ts — Tests for the coaching tips dictionary and helpers.
 */

import { describe, it, expect } from "vitest";
import { COACHING_TIPS, isWithinHoursAgo } from "../coaching";

describe("COACHING_TIPS dictionary", () => {
  it("includes all 5 expected contexts", () => {
    const ids = Object.keys(COACHING_TIPS).sort();
    expect(ids).toEqual([
      "bedtime_struggle",
      "first_setup",
      "phase_advance",
      "premature_wake",
      "streak_break",
    ]);
  });

  it("every tip has at least 3 actions", () => {
    for (const tip of Object.values(COACHING_TIPS)) {
      expect(tip.actions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every tip has a title and id matching the key", () => {
    for (const [key, tip] of Object.entries(COACHING_TIPS)) {
      expect(tip.id).toBe(key);
      expect(tip.title.length).toBeGreaterThan(0);
    }
  });

  it("premature_wake tip has rationale (most behavioral)", () => {
    expect(COACHING_TIPS.premature_wake.rationale).toBeTruthy();
  });

  it("every action has a valid type and non-empty text", () => {
    for (const tip of Object.values(COACHING_TIPS)) {
      for (const action of tip.actions) {
        expect(["do", "avoid"]).toContain(action.type);
        expect(action.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("isWithinHoursAgo", () => {
  it("returns false for null timestamp", () => {
    expect(isWithinHoursAgo(null, 24)).toBe(false);
  });

  it("returns true for recent timestamp", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isWithinHoursAgo(oneHourAgo, 24)).toBe(true);
  });

  it("returns false for old timestamp", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinHoursAgo(tenDaysAgo, 24)).toBe(false);
  });

  it("returns false for future timestamps (negative age)", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(isWithinHoursAgo(tomorrow, 24)).toBe(false);
  });

  it("returns true for timestamp exactly at the boundary", () => {
    const exactly1HourAgo = new Date(Date.now() - 60 * 60 * 1000 + 1000).toISOString();
    expect(isWithinHoursAgo(exactly1HourAgo, 1)).toBe(true);
  });
});
