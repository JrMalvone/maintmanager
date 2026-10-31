import { describe, it, expect } from "vitest";
import { computeMachineMetrics } from "@/lib/machineMetrics";

const base = { status: "closed", maintenance_type: "mechanical", created_at: "2026-10-05T10:00:00", started_at: "2026-10-05T10:10:00", finished_at: "2026-10-05T11:00:00" } as any;

describe("machine metrics", () => {
  it("counts only emergency corrective (machine stopped) orders as stops", () => {
    const m = computeMachineMetrics([{ ...base, id: "a", is_machine_stopped: true }, { ...base, id: "b", is_machine_stopped: false }], []);
    expect(m.stops).toBe(1);
    expect(m.totalOrders).toBe(2);
  });
});

import { reliability, plannedMinutes } from "@/lib/reliability";
describe("reliability formulas", () => {
  it("availability = (planned − downtime) / planned", () => {
    expect(reliability(1000, 50, 1).availability).toBe(95);
  });
  it("MTBF = operating time / stops, even with one stop", () => {
    expect(reliability(1000, 100, 1).mtbf).toBe(900);
    expect(reliability(1000, 100, 3).mtbf).toBe(300);
  });
  it("planned time = days × shifts × 8h", () => {
    const s = new Date("2026-10-01T00:00:00Z"), e = new Date("2026-10-02T00:00:00Z");
    expect(plannedMinutes(s, e, 2, new Date("2027-01-01"))).toBe(960);
  });
});
