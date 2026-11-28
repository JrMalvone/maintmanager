import { describe, expect, it } from "vitest";
import {
  describeKanbanPartScope,
  getActiveOrderConsumptions,
  getKanbanMissingQuantity,
  getKanbanStockPercent,
  getKanbanTrafficLight,
  partAppliesToMachine,
  partAppliesToScope,
  sortKanbanPartsByUrgency,
  summarizeKanbanParts,
  type KanbanMovement,
} from "@/lib/kanbanParts";

describe("kanbanParts rules", () => {
  it("classifies 0 units as red (critical)", () => {
    expect(getKanbanTrafficLight(0, 4)).toBe("red");
    expect(getKanbanTrafficLight(0, 1)).toBe("red");
  });

  it("classifies >0 and <=50% of target as yellow (attention)", () => {
    expect(getKanbanTrafficLight(2, 4)).toBe("yellow");
    expect(getKanbanTrafficLight(1, 4)).toBe("yellow");
    expect(getKanbanTrafficLight(1, 2)).toBe("yellow");
    expect(getKanbanTrafficLight(5, 10)).toBe("yellow");
  });

  it("classifies >50% of target as green (adequate stock)", () => {
    expect(getKanbanTrafficLight(3, 4)).toBe("green");
    expect(getKanbanTrafficLight(4, 4)).toBe("green");
    expect(getKanbanTrafficLight(1, 1)).toBe("green");
    expect(getKanbanTrafficLight(6, 10)).toBe("green");
    expect(getKanbanTrafficLight(12, 10)).toBe("green");
  });

  it("calculates missing quantity and stock percentage without negative values", () => {
    expect(getKanbanMissingQuantity(1, 5)).toBe(4);
    expect(getKanbanMissingQuantity(7, 5)).toBe(0);
    expect(getKanbanStockPercent(2, 4)).toBe(50);
    expect(getKanbanStockPercent(0, 4)).toBe(0);
  });

  it("summarizes traffic light counts and prioritizes red then yellow then green", () => {
    const parts = [
      { code: "003", current_quantity: 4, target_quantity: 4 },
      { code: "002", current_quantity: 2, target_quantity: 4 },
      { code: "001", current_quantity: 0, target_quantity: 4 },
    ];
    expect(summarizeKanbanParts(parts)).toEqual({
      total: 3,
      green: 1,
      yellow: 1,
      red: 1,
      needsRestock: 2,
    });
    expect(sortKanbanPartsByUrgency(parts).map((p) => p.code)).toEqual(["001", "002", "003"]);
  });

  it("filters out reversed consumption movements on an order", () => {
    const base: Omit<KanbanMovement, "id" | "movement_type" | "reversed_movement_id"> = {
      part_id: "p1",
      quantity: 1,
      previous_quantity: 3,
      new_quantity: 2,
      order_type: "corrective",
      corrective_order_id: "o1",
      preventive_order_id: null,
      actor_name: "Manutenção",
      notes: null,
      created_at: "2026-11-28T00:00:00Z",
    };
    const movements: KanbanMovement[] = [
      { ...base, id: "m1", movement_type: "consumption", reversed_movement_id: null },
      { ...base, id: "m2", movement_type: "consumption", reversed_movement_id: null },
      { ...base, id: "m3", movement_type: "reversal", reversed_movement_id: "m1" },
    ];
    expect(getActiveOrderConsumptions(movements).map((m) => m.id)).toEqual(["m2"]);
  });

  it("isolates the same part code and stock targets by sector", () => {
    const machines = new Map([["m1", { sector_id: "s1" }], ["m2", { sector_id: "s2" }]]);
    const parts = [
      { code: "6205", sector_id: "s1", cabinet_id: "c1", machine_ids: ["m1"], is_universal: false, current_quantity: 8, target_quantity: 10 },
      { code: "6205", sector_id: "s2", cabinet_id: "c2", machine_ids: ["m2"], is_universal: false, current_quantity: 1, target_quantity: 4 },
    ];
    const first = parts.filter(p => partAppliesToScope(p, "s1", "all", machines));
    const second = parts.filter(p => partAppliesToScope(p, "s2", "all", machines));
    expect(first.map(p => [p.current_quantity, p.target_quantity])).toEqual([[8, 10]]);
    expect(second.map(p => [p.current_quantity, p.target_quantity])).toEqual([[1, 4]]);
    expect(summarizeKanbanParts(first).green).toBe(1);
    expect(summarizeKanbanParts(second).yellow).toBe(1);
  });

  it("isolates the same part code across multiple cabinets within the same sector", () => {
    const machines = new Map([
      ["m1", { sector_id: "s1" }],
      ["m2", { sector_id: "s1" }],
    ]);
    const parts = [
      { code: "6205", sector_id: "s1", cabinet_id: "cab-a", machine_ids: ["m1", "m2"], is_universal: false, current_quantity: 6, target_quantity: 8 },
      { code: "6205", sector_id: "s1", cabinet_id: "cab-b", machine_ids: ["m2"], is_universal: false, current_quantity: 0, target_quantity: 4 },
    ];
    const cabA = parts.filter(p => partAppliesToScope(p, "s1", "all", machines, "cab-a"));
    const cabB = parts.filter(p => partAppliesToScope(p, "s1", "all", machines, "cab-b"));
    const forM2 = parts.filter(p => partAppliesToScope(p, "s1", "m2", machines, "all"));
    expect(cabA.map(p => p.current_quantity)).toEqual([6]);
    expect(cabB.map(p => p.current_quantity)).toEqual([0]);
    expect(summarizeKanbanParts(cabA).green).toBe(1);
    expect(summarizeKanbanParts(cabB).red).toBe(1);
    expect(forM2).toHaveLength(2);
  });

  it("includes cabinet and sector names in scope description", () => {
    const machines = new Map([["m1", { code: "0102", model: "Prensa", sector_id: "s1" }]]);
    const sectors = new Map([["s1", { name: "Estamparia" }]]);
    const cabinets = new Map([["c1", { name: "Armário Mecânico 1" }]]);
    const scope = describeKanbanPartScope(
      { sector_id: "s1", cabinet_id: "c1", is_universal: false, machine_ids: ["m1"] },
      machines,
      sectors,
      (m) => (m ? `${m.code} - ${m.model}` : ""),
      cabinets
    );
    expect(scope.cabinetName).toBe("Armário Mecânico 1");
    expect(scope.secondary).toBe("Armário Mecânico 1 · Estamparia");
    expect(scope.summaryText).toContain("Armário Mecânico 1");
  });

  it("limits universal parts to their own sector including machine-less orders", () => {
    const universal = { sector_id: "s1", cabinet_id: "c1", is_universal: true, machine_ids: [] };
    const machines = new Map([["m1", { sector_id: "s1" }], ["m2", { sector_id: "s2" }]]);
    expect(partAppliesToMachine(universal, null, "s1")).toBe(true);
    expect(partAppliesToMachine(universal, null, "s2")).toBe(false);
    expect(partAppliesToMachine(universal, null, null)).toBe(false);
    expect(partAppliesToScope(universal, "s2", "universal", machines)).toBe(false);
    expect(partAppliesToScope(universal, "all", "m2", machines)).toBe(false);
    expect(partAppliesToScope(universal, "s1", "m1", machines)).toBe(true);
  });
  it("only offers specific parts to linked machines in their sector", () => {
    const part = { sector_id: "s1", is_universal: false, machine_ids: ["m1"] };
    expect(partAppliesToMachine(part, "m1", "s1")).toBe(true);
    expect(partAppliesToMachine(part, "m2", "s1")).toBe(false);
    expect(partAppliesToMachine(part, "m1", "s2")).toBe(false);
  });
});
