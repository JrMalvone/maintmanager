import { describe, it, expect } from "vitest";
import {
  PREVENTIVE_MAINTENANCE_LABELS,
  formatEstimatedMinutes,
  parseHoursMinutesToMinutes,
  resolvePreventiveWorkCenter,
  resolveSapSyncStatus,
  resolveStatusAfterEstimate,
} from "@/lib/preventiveOrders";

describe("preventive & backlog order rules", () => {
  it("supports all 4 maintenance types requested", () => {
    expect(Object.keys(PREVENTIVE_MAINTENANCE_LABELS).sort()).toEqual([
      "electronic",
      "mechanical",
      "metalwork",
      "parts_purchase",
    ]);
    expect(PREVENTIVE_MAINTENANCE_LABELS.metalwork).toBe("Serralheria");
    expect(PREVENTIVE_MAINTENANCE_LABELS.parts_purchase).toBe("Compra de Peças");
  });

  it("moves pending_planning to planned when estimated time is stipulated", () => {
    expect(resolveStatusAfterEstimate("pending_planning", 90)).toBe("planned");
    expect(resolveStatusAfterEstimate("pending_planning", null)).toBe("pending_planning");
    expect(resolveStatusAfterEstimate("in_progress", 90)).toBe("in_progress");
  });

  it("only queues SAP sync when order is completed", () => {
    expect(resolveSapSyncStatus("pending_planning", "NotApplicable", null)).toBe("NotApplicable");
    expect(resolveSapSyncStatus("planned", "NotApplicable", null)).toBe("NotApplicable");
    expect(resolveSapSyncStatus("in_progress", "NotApplicable", null)).toBe("NotApplicable");
    expect(resolveSapSyncStatus("canceled", "NotApplicable", null)).toBe("NotApplicable");
    expect(resolveSapSyncStatus("completed", "NotApplicable", null)).toBe("Pending");
    expect(resolveSapSyncStatus("completed", "Synced", "100045")).toBe("Synced");
  });

  it("validates hours and minutes estimation inputs", () => {
    expect(parseHoursMinutesToMinutes("2", "30")).toBe(150);
    expect(parseHoursMinutesToMinutes("0", "45")).toBe(45);
    expect(parseHoursMinutesToMinutes("0", "0")).toBe(-1);
    expect(parseHoursMinutesToMinutes("-1", "10")).toBe(-1);
    expect(parseHoursMinutesToMinutes("1", "75")).toBe(-1);
    expect(parseHoursMinutesToMinutes("", "")).toBeNull();
    expect(formatEstimatedMinutes(150)).toBe("2h 30min");
  });

  it("resolves work centers for all maintenance types including metalwork and parts_purchase", () => {
    const sector = {
      name: "Cartucho",
      work_center_electronic: "CAR-ELT",
      work_center_mechanical: "CAR-MEC",
    };
    expect(resolvePreventiveWorkCenter("electronic", sector)).toBe("CAR-ELT");
    expect(resolvePreventiveWorkCenter("mechanical", sector)).toBe("CAR-MEC");
    expect(resolvePreventiveWorkCenter("metalwork", sector)).toBe("CAR-SER");
    expect(resolvePreventiveWorkCenter("parts_purchase", sector)).toBe("CAR-CMP");
  });
});