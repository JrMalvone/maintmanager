import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Machine, ServiceOrder } from "@/hooks/useData";
import { CriticalDowntimeTable } from "./CriticalDowntimeTable";

const machine = {
  id: "machine-a",
  code: "007",
  model: "Prensa X",
} as Machine;

const start = "2026-09-22T08:00:00.000Z";

function order(id: string, overrides: Partial<ServiceOrder> = {}): ServiceOrder {
  return {
    id,
    machine_id: machine.id,
    problem_description: `Problema ${id}`,
    status: "closed",
    is_machine_stopped: true,
    created_at: start,
    finished_at: "2026-09-22T11:01:00.000Z",
    ...overrides,
  } as ServiceOrder;
}

describe("Paradas acima de 3 horas", () => {
  it("exibe apenas ordens fechadas e paradas por mais de 3h; abre detalhes ao clicar", () => {
    const onOrderClick = vi.fn();
    const valid = order("valid");
    render(
      <CriticalDowntimeTable
        machines={[machine]}
        orders={[
          valid,
          order("open", { status: "open" }),
          order("running", { is_machine_stopped: false }),
          order("exactly-three", { finished_at: "2026-09-22T11:00:00.000Z" }),
          order("unfinished", { finished_at: null }),
        ]}
        onOrderClick={onOrderClick}
      />
    );

    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("007 · Prensa X")).toBeInTheDocument();
    expect(screen.getByText("Problema valid")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Problema valid"));
    expect(onOrderClick).toHaveBeenCalledWith(valid);
  });
});