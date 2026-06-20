import { describe, it, expect } from "vitest";
import {
  collapseNights,
  wakeMinutesOf,
  effortBreakdown,
  energyBreakdown,
  activityBreakdown,
  tensionBreakdown,
  dosesBreakdown,
  buildCrossInsight,
  type NightRow,
} from "../insights";
import type { DayContext, SleepLog, MentalEffort, EnergyState } from "../types";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

/** Builds a completed SleepLog with local-time bedtime/wake on a given date. */
function makeSession(
  date: string,
  wakeHour: number,
  opts: { quality?: "normal" | "premature"; doses?: number; bedHour?: number } = {},
): SleepLog {
  const [y, m, d] = date.split("-").map(Number);
  const bed = new Date(y, m - 1, d - 1, opts.bedHour ?? 21, 0).toISOString();
  const wake = new Date(y, m - 1, d, wakeHour, 0).toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    date,
    bedtime: bed,
    wake_time: wake,
    source: "manual",
    quality: opts.quality ?? "normal",
    notes: null,
    melatonin_doses: opts.doses ?? 1,
    created_at: new Date().toISOString(),
  };
}

function makeCtx(
  date: string,
  fields: Partial<Pick<DayContext, "mental_effort" | "energy_state" | "physical_activity" | "somatic_tension">>,
): DayContext {
  return {
    id: crypto.randomUUID(),
    user_id: "user-1",
    date,
    mental_effort: fields.mental_effort ?? null,
    energy_state: fields.energy_state ?? null,
    physical_activity: fields.physical_activity ?? null,
    somatic_tension: fields.somatic_tension ?? null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Night-minutes reference: 04:00 → 1680, 05:00 → 1740, 06:00 → 1800.
const NM = (hour: number) => hour * 60 + 1440;

// ─── collapseNights ──────────────────────────────────────────────────────────

describe("collapseNights", () => {
  it("produces one night per date with the wake of the single session", () => {
    const nights = collapseNights([makeSession("2026-05-07", 5)], []);
    expect(nights).toHaveLength(1);
    expect(wakeMinutesOf(nights[0])).toBe(NM(5));
    expect(nights[0].fragmented).toBe(false);
  });

  it("does NOT double-count a fragmented night and uses the latest normal wake", () => {
    // Premature wake at 04:00, retry, real wake at 06:00 — same date.
    const logs = [
      makeSession("2026-05-07", 4, { quality: "premature", doses: 1 }),
      makeSession("2026-05-07", 6, { quality: "normal", doses: 1, bedHour: 5 }),
    ];
    const nights = collapseNights(logs, []);
    expect(nights).toHaveLength(1);
    expect(wakeMinutesOf(nights[0])).toBe(NM(6)); // latest normal wake, not 04:00
    expect(nights[0].fragmented).toBe(true);
  });

  it("sums melatonin doses across the night's sessions", () => {
    const logs = [
      makeSession("2026-05-07", 4, { quality: "premature", doses: 2 }),
      makeSession("2026-05-07", 6, { quality: "normal", doses: 1, bedHour: 5 }),
    ];
    const nights = collapseNights(logs, []);
    expect(nights[0].melatoninDoses).toBe(3);
  });

  it("drops a night that has only premature wakes (no real awakening)", () => {
    const logs = [makeSession("2026-05-07", 4, { quality: "premature" })];
    expect(collapseNights(logs, [])).toHaveLength(0);
  });

  it("merges day_context by date", () => {
    const nights = collapseNights(
      [makeSession("2026-05-07", 5)],
      [makeCtx("2026-05-07", { mental_effort: "heavy" })],
    );
    expect(nights[0].ctx?.mental_effort).toBe("heavy");
  });

  it("leaves ctx undefined when no context for that date (skippable)", () => {
    const nights = collapseNights([makeSession("2026-05-07", 5)], []);
    expect(nights[0].ctx).toBeUndefined();
  });
});

// ─── Breakdowns ──────────────────────────────────────────────────────────────

describe("breakdowns", () => {
  it("effortBreakdown averages wake-minutes per level and nulls empty categories", () => {
    const nights = collapseNights(
      [makeSession("2026-05-07", 4), makeSession("2026-05-08", 6)],
      [
        makeCtx("2026-05-07", { mental_effort: "moderate" }),
        makeCtx("2026-05-08", { mental_effort: "moderate" }),
      ],
    );
    const bd = effortBreakdown(nights);
    expect(bd.moderate).toBe((NM(4) + NM(6)) / 2); // 1740
    expect(bd.light).toBeNull();
    expect(bd.heavy).toBeNull();
  });

  it("energyBreakdown groups by energy_state", () => {
    const nights = collapseNights(
      [makeSession("2026-05-07", 4)],
      [makeCtx("2026-05-07", { energy_state: "clear_calm" })],
    );
    const bd = energyBreakdown(nights);
    expect(bd.clear_calm).toBe(NM(4));
    expect(bd.wired_overactive).toBeNull();
  });

  it("activityBreakdown and tensionBreakdown work", () => {
    const nights = collapseNights(
      [makeSession("2026-05-07", 5)],
      [makeCtx("2026-05-07", { physical_activity: "intense", somatic_tension: "relaxed" })],
    );
    expect(activityBreakdown(nights).intense).toBe(NM(5));
    expect(activityBreakdown(nights).none).toBeNull();
    expect(tensionBreakdown(nights).relaxed).toBe(NM(5));
    expect(tensionBreakdown(nights).tense).toBeNull();
  });

  it("dosesBreakdown buckets by dose count and nulls empty", () => {
    const nights = collapseNights(
      [
        makeSession("2026-05-07", 4, { doses: 1 }),
        makeSession("2026-05-08", 6, { doses: 2 }),
      ],
      [],
    );
    const bd = dosesBreakdown(nights);
    expect(bd[1]).toBe(NM(4));
    expect(bd[2]).toBe(NM(6));
    expect(bd[3]).toBeNull();
  });

  it("handles empty input without dividing by zero", () => {
    const empty: NightRow[] = [];
    expect(effortBreakdown(empty).light).toBeNull();
    expect(dosesBreakdown(empty)[1]).toBeNull();
  });
});

// ─── buildCrossInsight ───────────────────────────────────────────────────────

describe("buildCrossInsight", () => {
  it("returns the keep-logging gate message below the trend threshold", () => {
    const nights = collapseNights(
      [makeSession("2026-05-07", 5)],
      [makeCtx("2026-05-07", { mental_effort: "moderate", energy_state: "clear_calm" })],
    );
    const out = buildCrossInsight(nights);
    expect(out).toMatch(/Seguí registrando/);
    expect(out).toMatch(/faltan 13 noches/);
  });

  it("produces an ASSOCIATION string (no causal language) at N≥14", () => {
    const efforts: MentalEffort[] = ["light", "moderate", "heavy"];
    const energies: EnergyState[] = ["clear_calm", "wired_overactive", "drained_restless"];
    // 14 nights: "moderate + clear_calm" gets the earliest wakes (04:00),
    // the rest later (06:00) — so the best category should surface those.
    const nights14 = Array.from({ length: 14 }, (_, i) => {
      const date = `2026-05-${String(i + 1).padStart(2, "0")}`;
      const isBest = i < 7;
      return {
        log: makeSession(date, isBest ? 4 : 6),
        ctx: makeCtx(date, {
          mental_effort: isBest ? "moderate" : efforts[i % 3],
          energy_state: isBest ? "clear_calm" : energies[i % 3],
        }),
      };
    });
    const logs: SleepLog[] = nights14.map((n) => n.log);
    const ctx: DayContext[] = nights14.map((n) => n.ctx);
    const out = buildCrossInsight(collapseNights(logs, ctx));
    expect(out).toMatch(/se asocian con/);
    expect(out).toMatch(/no implica causa/);
    expect(out).not.toMatch(/causa el|provoca|porque/i);
  });
});
