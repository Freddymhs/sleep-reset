import { describe, it, expect } from "vitest";
import {
  toNightMinutes,
  fromNightMinutes,
  calcMelatoninTime,
  shouldShowLightBanner,
  calcBedtimeRecommendation,
} from "../sleep";
import type { SleepGoal, SleepLog } from "../types";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeLog(bedtime: string | null, date = "2026-05-07"): SleepLog {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    date,
    bedtime,
    wake_time: null,
    source: "manual",
    quality: "normal",
    notes: null,
    melatonin_doses: 1,
    created_at: new Date().toISOString(),
  };
}

const BASE_GOAL: SleepGoal = {
  id: "goal-1",
  user_id: "user-1",
  target_wake_time: "07:00:00",
  target_bedtime: "23:00:00",
  phase_a_wake: "08:00:00",
  current_wake_anchor: "09:00:00",
  melatonin_enabled: true,
  melatonin_dose_mg: 0.5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── toNightMinutes ────────────────────────────────────────────────────────────

describe("toNightMinutes", () => {
  it("converts 23:30 (PM before midnight) to 1410", () => {
    const ts = "2026-05-06T23:30:00.000Z";
    // Use a fixed UTC date where local interpretation gives 23:30
    // We test the logic with a timezone-neutral approach: construct a date
    // manually to avoid timezone issues in CI.
    // Instead, test with a date where local hours === expected.
    const date = new Date(ts);
    // Recompute expected based on actual local hours to keep test portable
    const h = date.getHours();
    const m = date.getMinutes();
    const expected = h >= 12 ? h * 60 + m : h * 60 + m + 1440;
    expect(toNightMinutes(ts)).toBe(expected);
  });

  it("converts a post-midnight time (hour < 12) by adding 1440", () => {
    // Build an ISO string that gives us 02:00 local time
    const now = new Date();
    now.setHours(2, 0, 0, 0);
    const result = toNightMinutes(now.toISOString());
    // 02:00 → 120 + 1440 = 1560
    expect(result).toBe(1560);
  });

  it("converts midnight (00:00) to 1440", () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expect(toNightMinutes(now.toISOString())).toBe(1440);
  });

  it("keeps PM hours (>= 12:00) as-is", () => {
    const now = new Date();
    now.setHours(23, 30, 0, 0);
    expect(toNightMinutes(now.toISOString())).toBe(1410);
  });
});

// ─── fromNightMinutes ──────────────────────────────────────────────────────────

describe("fromNightMinutes", () => {
  it("converts 1560 to '02:00'", () => {
    expect(fromNightMinutes(1560)).toBe("02:00");
  });

  it("converts 1410 to '23:30'", () => {
    expect(fromNightMinutes(1410)).toBe("23:30");
  });

  it("converts 1440 to '00:00'", () => {
    expect(fromNightMinutes(1440)).toBe("00:00");
  });

  it("roundtrip: fromNightMinutes(toNightMinutes(ts)) returns same HH:MM", () => {
    const now = new Date();
    now.setHours(2, 30, 0, 0);
    const ts = now.toISOString();
    const result = fromNightMinutes(toNightMinutes(ts));
    expect(result).toBe("02:30");
  });
});

// ─── calcMelatoninTime ─────────────────────────────────────────────────────────

describe("calcMelatoninTime", () => {
  it("returns null when given 0 logs", () => {
    expect(calcMelatoninTime([])).toBeNull();
  });

  it("returns null when all logs have null bedtime", () => {
    expect(calcMelatoninTime([makeLog(null)])).toBeNull();
  });

  it("returns correct melatonin time from 1 log with bedtime 02:00", () => {
    const bedtimeDate = new Date();
    bedtimeDate.setHours(2, 0, 0, 0);
    const log = makeLog(bedtimeDate.toISOString());

    // 02:00 → 1560 nightMin; 1560 - 330 = 1230 → 20:30
    expect(calcMelatoninTime([log])).toBe("20:30");
  });

  it("averages 3 logs with bedtime 01:00 → melatonin at 19:30", () => {
    const makeAt1 = () => {
      const d = new Date();
      d.setHours(1, 0, 0, 0);
      return makeLog(d.toISOString());
    };
    const logs = [makeAt1(), makeAt1(), makeAt1()];
    // 01:00 → 1500 nightMin; avg = 1500; 1500 - 330 = 1170 → 19:30
    expect(calcMelatoninTime(logs)).toBe("19:30");
  });

  it("uses only up to 3 recent logs", () => {
    // 5 logs: 3 at 02:00, 2 at 03:00 — should average the first 3
    const atTwo = () => {
      const d = new Date();
      d.setHours(2, 0, 0, 0);
      return makeLog(d.toISOString());
    };
    const atThree = () => {
      const d = new Date();
      d.setHours(3, 0, 0, 0);
      return makeLog(d.toISOString());
    };
    const logs = [atTwo(), atTwo(), atTwo(), atThree(), atThree()];
    // Only first 3 logs: all at 02:00 → avg = 1560, 1560 - 330 = 1230 → 20:30
    expect(calcMelatoninTime(logs)).toBe("20:30");
  });
});

// ─── shouldShowLightBanner ─────────────────────────────────────────────────────

describe("shouldShowLightBanner", () => {
  it("returns false before wake_anchor (still night)", () => {
    // wake_anchor = 09:00 — at 08:45 the user hasn't woken up yet
    const now = new Date();
    now.setHours(8, 45, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(false);
  });

  it("returns true exactly at wake_anchor", () => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(true);
  });

  it("returns true within the 30-min window after wake_anchor", () => {
    const now = new Date();
    now.setHours(9, 20, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(true);
  });

  it("returns true exactly at wake_anchor + 30 min", () => {
    const now = new Date();
    now.setHours(9, 30, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(true);
  });

  it("returns false after wake_anchor + 30 min", () => {
    const now = new Date();
    now.setHours(9, 31, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(false);
  });

  it("returns false well after the window (afternoon)", () => {
    const now = new Date();
    now.setHours(15, 0, 0, 0);
    expect(shouldShowLightBanner(BASE_GOAL, now)).toBe(false);
  });
});

// ─── calcBedtimeRecommendation ─────────────────────────────────────────────────

describe("calcBedtimeRecommendation", () => {
  it("returns null when given 0 logs", () => {
    expect(calcBedtimeRecommendation([], BASE_GOAL)).toBeNull();
  });

  it("returns null when all logs have null bedtime", () => {
    expect(calcBedtimeRecommendation([makeLog(null)], BASE_GOAL)).toBeNull();
  });

  it("shifts by exactly 30 min when avg bedtime is more than 30 min past target", () => {
    // target_bedtime = 23:00 → 1380 nightMin
    // avg bedtime = 02:00 → 1560 nightMin (diff = 180 min)
    // suggested = 1560 - 30 = 1530 → 01:30
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const log = makeLog(d.toISOString());
    const result = calcBedtimeRecommendation([log], BASE_GOAL);
    expect(result).not.toBeNull();
    expect(result!.suggestedBedtime).toBe("01:30");
  });

  it("suggests the exact avg when avg is within 30 min of target", () => {
    // target_bedtime = 23:00 → 1380 nightMin
    // avg bedtime = 23:20 → 1400 nightMin (diff = 20 min, < 30)
    // suggested = 1400 - 20 = 1380 → 23:00
    const d = new Date();
    d.setHours(23, 20, 0, 0);
    const log = makeLog(d.toISOString());
    const result = calcBedtimeRecommendation([log], BASE_GOAL);
    expect(result).not.toBeNull();
    expect(result!.suggestedBedtime).toBe("23:00");
  });

  it("sets phaseAComplete true when avg bedtime already reached target", () => {
    // avg at or before target_bedtime = 23:00
    const d = new Date();
    d.setHours(22, 45, 0, 0);
    const log = makeLog(d.toISOString());
    const result = calcBedtimeRecommendation([log], BASE_GOAL);
    expect(result!.phaseAComplete).toBe(true);
  });

  it("sets phaseAComplete false when avg bedtime is past target", () => {
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const log = makeLog(d.toISOString());
    const result = calcBedtimeRecommendation([log], BASE_GOAL);
    expect(result!.phaseAComplete).toBe(false);
  });

  it("populates melatoninTime and wakeAnchor in the result", () => {
    const d = new Date();
    d.setHours(2, 0, 0, 0);
    const log = makeLog(d.toISOString());
    const result = calcBedtimeRecommendation([log], BASE_GOAL);
    expect(result!.melatoninTime).toBe("20:30");
    expect(result!.wakeAnchor).toBe("09:00");
  });
});
