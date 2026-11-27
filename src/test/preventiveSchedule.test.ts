import { describe, it, expect } from "vitest";
import { PERIODICITIES, nextPreventiveDate, isInReleaseWindow, projectPreventiveDates } from "@/lib/preventiveSchedule";

describe("calendário preventivo", () => {
  it("oferece as oito periodicidades", () => {
    expect(Object.keys(PERIODICITIES)).toEqual(["once", "weekly", "fortnightly", "monthly", "bimonthly", "quarterly", "semiannual", "annual"]);
  });
  it.each([["weekly",7],["fortnightly",15],["monthly",30],["bimonthly",60],["quarterly",90],["semiannual",180],["annual",365]] as const)("aplica %s em dias corridos", (period, days) => {
    expect(nextPreventiveDate("2026-01-01", period)).toBe(new Date(Date.UTC(2026,0,1 + days)).toISOString().slice(0,10));
  });
  it("única não se repete", () => {
    expect(nextPreventiveDate("2026-11-25", "once")).toBeNull();
    expect(projectPreventiveDates("2026-11-25", "once", "2026-01-01", "2026-12-31")).toEqual(["2026-11-25"]);
  });
  it("libera sete dias antes, nunca oito; mantém atrasadas", () => {
    expect(isInReleaseWindow("2026-12-04", "2026-11-27")).toBe(true);
    expect(isInReleaseWindow("2026-12-05", "2026-11-27")).toBe(false);
    expect(isInReleaseWindow("2026-11-20", "2026-11-27")).toBe(true);
  });
  it("recalcula mensal a partir do término atrasado, exatamente 30 dias", () => {
    const next = nextPreventiveDate("2026-11-25", "monthly");
    expect(next).toBe("2026-12-25");
    expect(projectPreventiveDates(next ?? "", "monthly", "2026-12-01", "2027-02-28")).toEqual(["2026-12-25", "2027-01-24", "2027-02-23"]);
  });
});