import { describe, it, expect } from "vitest";
import {
  PREVENTIVE_MAINTENANCE_LABELS,
  PREVENTIVE_STATUS_LABELS,
  canReleasePreventiveOrder,
  formatEstimatedMinutes,
  getPreventiveOrderDelayInfo,
  parseHoursMinutesToMinutes,
  resolvePreventiveWorkCenter,
  resolveSapSyncStatus,
  validatePreventiveTransition,
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

  it("requires both estimated time and confirmed materials before releasing to execution", () => {
    expect(canReleasePreventiveOrder(90, true)).toBe(true);
    expect(canReleasePreventiveOrder(90, false)).toBe(false);
    expect(canReleasePreventiveOrder(90, null)).toBe(false);
    expect(canReleasePreventiveOrder(null, true)).toBe(false);
    expect(canReleasePreventiveOrder(0, true)).toBe(false);

    expect(
      validatePreventiveTransition({
        nextStatus: "planned",
        estimatedMinutes: 60,
        hasMaterials: true,
        partsExpectedDate: null,
      }).ok
    ).toBe(true);
    expect(
      validatePreventiveTransition({
        nextStatus: "planned",
        estimatedMinutes: 60,
        hasMaterials: false,
        partsExpectedDate: null,
      }).ok
    ).toBe(false);
    expect(
      validatePreventiveTransition({
        nextStatus: "planned",
        estimatedMinutes: null,
        hasMaterials: true,
        partsExpectedDate: null,
      }).ok
    ).toBe(false);
  });

  it("requires parts expected date when moving to waiting_parts", () => {
    expect(PREVENTIVE_STATUS_LABELS.waiting_parts).toBe("Aguardando Compra de Peças");
    expect(
      validatePreventiveTransition({
        nextStatus: "waiting_parts",
        estimatedMinutes: null,
        hasMaterials: false,
        partsExpectedDate: null,
      }).ok
    ).toBe(false);
    expect(
      validatePreventiveTransition({
        nextStatus: "waiting_parts",
        estimatedMinutes: 45,
        hasMaterials: false,
        partsExpectedDate: "2026-12-10",
      }).ok
    ).toBe(true);
  });

  it("only queues SAP sync when order is completed", () => {
    expect(resolveSapSyncStatus("pending_planning", "NotApplicable", null)).toBe("NotApplicable");
    expect(resolveSapSyncStatus("waiting_parts", "NotApplicable", null)).toBe("NotApplicable");
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

  it("flags overdue planned date for uncompleted preventive orders including in_progress", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    const plannedLate = getPreventiveOrderDelayInfo(
      { status: "planned", scheduled_date: "2026-11-24", estimated_minutes: 60, started_at: null, finished_at: null },
      now
    );
    expect(plannedLate.isDateOverdue).toBe(true);
    expect(plannedLate.daysOverdue).toBe(3);
    expect(plannedLate.isTimeExceeded).toBe(false);

    const inProgressLate = getPreventiveOrderDelayInfo(
      { status: "in_progress", scheduled_date: "2026-11-25", estimated_minutes: 60, started_at: "2026-11-27T11:30:00Z", finished_at: null },
      now
    );
    expect(inProgressLate.isDateOverdue).toBe(true);
    expect(inProgressLate.daysOverdue).toBe(2);
    expect(inProgressLate.isTimeExceeded).toBe(false);
  });

  it("flags stipulated time exceeded for in_progress and completed backlog/preventive orders", () => {
    const now = new Date("2026-11-27T14:00:00Z");
    const runningOver = getPreventiveOrderDelayInfo(
      { status: "in_progress", scheduled_date: null, estimated_minutes: 60, started_at: "2026-11-27T12:15:00Z", finished_at: null },
      now
    );
    expect(runningOver.isDateOverdue).toBe(false);
    expect(runningOver.isTimeExceeded).toBe(true);
    expect(runningOver.durationMinutes).toBe(105);
    expect(runningOver.overtimeMinutes).toBe(45);
    expect(runningOver.percentOfEstimate).toBe(175);

    const finishedOver = getPreventiveOrderDelayInfo(
      { status: "completed", scheduled_date: "2026-11-20", estimated_minutes: 90, started_at: "2026-11-27T10:00:00Z", finished_at: "2026-11-27T12:00:00Z" },
      now
    );
    expect(finishedOver.isDateOverdue).toBe(false);
    expect(finishedOver.isTimeExceeded).toBe(true);
    expect(finishedOver.overtimeMinutes).toBe(30);

    const canceled = getPreventiveOrderDelayInfo(
      { status: "canceled", scheduled_date: "2026-11-01", estimated_minutes: 30, started_at: "2026-11-01T10:00:00Z", finished_at: "2026-11-01T12:00:00Z" },
      now
    );
    expect(canceled.isDateOverdue).toBe(false);
    expect(canceled.isTimeExceeded).toBe(false);
  });

  it("flags overdue expected arrival date for waiting_parts orders", () => {
    const now = new Date("2026-11-28T12:00:00Z");
    const lateParts = getPreventiveOrderDelayInfo(
      {
        status: "waiting_parts",
        scheduled_date: null,
        parts_expected_date: "2026-11-25",
        estimated_minutes: 60,
        started_at: null,
        finished_at: null,
      },
      now
    );
    expect(lateParts.isPartsOverdue).toBe(true);
    expect(lateParts.partsDaysOverdue).toBe(3);

    const onTimeParts = getPreventiveOrderDelayInfo(
      {
        status: "waiting_parts",
        scheduled_date: null,
        parts_expected_date: "2026-12-05",
        estimated_minutes: 60,
        started_at: null,
        finished_at: null,
      },
      now
    );
    expect(onTimeParts.isPartsOverdue).toBe(false);
    expect(onTimeParts.partsDaysOverdue).toBe(0);
  });
});