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
