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

  it("matches multi-machine and universal parts across machines and sectors", () => {
    const machinesMap = new Map([
      ["m1", { code: "2136", model: "Prensa A", sector_id: "s1" }],
      ["m2", { code: "2137", model: "Prensa B", sector_id: "s1" }],
      ["m3", { code: "3010", model: "Torno C", sector_id: "s2" }],
    ]);
    const sectorsMap = new Map([
      ["s1", { name: "Prensa" }],
      ["s2", { name: "Usinagem" }],
    ]);

    const sharedPart = { is_universal: false, machine_ids: ["m1", "m3"] };
    const universalPart = { is_universal: true, machine_ids: [] };
    const singlePart = { is_universal: false, machine_ids: ["m2"] };

    expect(partAppliesToMachine(sharedPart, "m1")).toBe(true);
    expect(partAppliesToMachine(sharedPart, "m3")).toBe(true);
    expect(partAppliesToMachine(sharedPart, "m2")).toBe(false);
    expect(partAppliesToMachine(universalPart, "m2")).toBe(true);
    expect(partAppliesToMachine(universalPart, null)).toBe(true);
    expect(partAppliesToMachine(singlePart, null)).toBe(false);

    expect(partAppliesToScope(sharedPart, "s1", "all", machinesMap)).toBe(true);
    expect(partAppliesToScope(sharedPart, "s2", "all", machinesMap)).toBe(true);
    expect(partAppliesToScope(singlePart, "s2", "all", machinesMap)).toBe(false);
    expect(partAppliesToScope(universalPart, "s2", "all", machinesMap)).toBe(true);
    expect(partAppliesToScope(universalPart, "all", "universal", machinesMap)).toBe(true);
    expect(partAppliesToScope(sharedPart, "all", "universal", machinesMap)).toBe(false);

    const sharedSummary = describeKanbanPartScope(
      sharedPart,
      machinesMap,
      sectorsMap,
      (m) => (m ? m.code : "—")
    );
    expect(sharedSummary.primary).toBe("2 máquinas: 2136, 3010");
    expect(sharedSummary.secondary).toBe("Prensa · Usinagem");

    const univSummary = describeKanbanPartScope(
      universalPart,
      machinesMap,
      sectorsMap,
      (m) => (m ? m.code : "—")
    );
    expect(univSummary.primary).toBe("Universal · Todas as máquinas");
    expect(univSummary.secondary).toBe("Todos os setores");
  });
});