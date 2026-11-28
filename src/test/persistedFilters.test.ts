import { beforeEach, describe, expect, it } from "vitest";
import {
  readStoredBoolean,
  readStoredString,
  readStoredStringArray,
  writeStoredBoolean,
  writeStoredString,
  writeStoredStringArray,
} from "@/lib/persistedFilters";
import { loadSavedFilter, presetRange, saveFilter } from "@/components/manager/DashboardFilters";

describe("persistedFilters", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists string values and rejects invalid enum values", () => {
    const allowed = ["month", "year"] as const;
    expect(readStoredString("cmms.calendar.view", "month", allowed)).toBe("month");

    writeStoredString("cmms.calendar.view", "year");
    expect(readStoredString("cmms.calendar.view", "month", allowed)).toBe("year");

    localStorage.setItem("cmms.calendar.view", "week");
    expect(readStoredString("cmms.calendar.view", "month", allowed)).toBe("month");
  });

  it("persists string arrays and ignores corrupt JSON", () => {
    writeStoredStringArray("cmms.preventive.sectors", ["sec-1", "sec-2"]);
    expect(readStoredStringArray("cmms.preventive.sectors")).toEqual(["sec-1", "sec-2"]);

    localStorage.setItem("cmms.preventive.sectors", "{invalid");
    expect(readStoredStringArray("cmms.preventive.sectors")).toEqual([]);

    localStorage.setItem("cmms.preventive.sectors", JSON.stringify(["ok", 123, null]));
    expect(readStoredStringArray("cmms.preventive.sectors")).toEqual(["ok"]);
  });

  it("persists boolean flags safely", () => {
    expect(readStoredBoolean("cmms.calendar.showPaused", false)).toBe(false);
    writeStoredBoolean("cmms.calendar.showPaused", true);
    expect(readStoredBoolean("cmms.calendar.showPaused", false)).toBe(true);
    writeStoredBoolean("cmms.calendar.showPaused", false);
    expect(readStoredBoolean("cmms.calendar.showPaused", true)).toBe(false);
  });

  it("keeps Equipment date filter independent from Manager Dashboard date filter", () => {
    saveFilter(presetRange("weekly"), "cmms.dashboard.dateFilter");
    saveFilter(presetRange("yearly"), "cmms.equipment.dateFilter");

    expect(loadSavedFilter("cmms.dashboard.dateFilter").preset).toBe("weekly");
    expect(loadSavedFilter("cmms.equipment.dateFilter").preset).toBe("yearly");

    localStorage.setItem(
      "cmms.equipment.dateFilter",
      JSON.stringify({ preset: "custom", start: "not-a-date", end: "not-a-date" })
    );
    expect(loadSavedFilter("cmms.equipment.dateFilter").preset).toBe("monthly");
  });
});