export type KanbanCategory = "mechanical" | "electronic";
export type KanbanTrafficLight = "green" | "yellow" | "red";
export type KanbanOrderType = "corrective" | "preventive" | "backlog";
export type KanbanMovementType = "consumption" | "replenishment" | "reversal" | "adjustment";

export interface KanbanCabinet {
  id: string;
  sector_id: string;
  name: string;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanPart {
  id: string;
  machine_id: string | null;
  sector_id: string | null;
  cabinet_id: string | null;
  is_universal: boolean;
  machine_ids: string[];
  code: string;
  description: string;
  category: KanbanCategory;
  target_quantity: number;
  current_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface KanbanMovement {
  id: string;
  part_id: string;
  movement_type: KanbanMovementType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  order_type: KanbanOrderType | null;
  corrective_order_id: string | null;
  preventive_order_id: string | null;
  actor_name: string | null;
  notes: string | null;
  reversed_movement_id: string | null;
  created_at: string;
}

export const KANBAN_CATEGORY_LABELS: Record<KanbanCategory, string> = {
  mechanical: "Mecânica",
  electronic: "Eletrônica",
};

export const KANBAN_TRAFFIC_LIGHT_LABELS: Record<KanbanTrafficLight, string> = {
  green: "Estoque Cheio",
  yellow: "Atenção · Repor",
  red: "Crítico · Zerado",
};

export const KANBAN_ORDER_TYPE_LABELS: Record<KanbanOrderType, string> = {
  corrective: "Corretiva",
  preventive: "Preventiva",
  backlog: "Backlog",
};

export const KANBAN_MOVEMENT_LABELS: Record<KanbanMovementType, string> = {
  consumption: "Baixa em OS",
  replenishment: "Reabastecimento",
  reversal: "Estorno",
  adjustment: "Ajuste",
};

/**
 * Standard Kanban traffic-light rule:
 * - red: 0 units in stock (critical / empty)
 * - yellow: > 0 and <= 50% of target quantity (attention / request restock)
 * - green: > 50% of target quantity (healthy stock)
 */
export function getKanbanTrafficLight(
  currentQuantity: number,
  targetQuantity: number
): KanbanTrafficLight {
  if (currentQuantity <= 0) return "red";
  if (targetQuantity <= 0) return "red";
  return currentQuantity / targetQuantity <= 0.5 ? "yellow" : "green";
}

export function getKanbanStockPercent(currentQuantity: number, targetQuantity: number): number {
  if (targetQuantity <= 0) return 0;
  return Math.round((Math.max(0, currentQuantity) / targetQuantity) * 100);
}

export function getKanbanMissingQuantity(currentQuantity: number, targetQuantity: number): number {
  return Math.max(0, targetQuantity - Math.max(0, currentQuantity));
}

export function summarizeKanbanParts(
  parts: Pick<KanbanPart, "current_quantity" | "target_quantity">[]
) {
  let green = 0;
  let yellow = 0;
  let red = 0;

  for (const part of parts) {
    const light = getKanbanTrafficLight(part.current_quantity, part.target_quantity);
    if (light === "red") red += 1;
    else if (light === "yellow") yellow += 1;
    else green += 1;
  }

  return {
    total: parts.length,
    green,
    yellow,
    red,
    needsRestock: red + yellow,
  };
}

const LIGHT_PRIORITY: Record<KanbanTrafficLight, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

export function sortKanbanPartsByUrgency<T extends Pick<KanbanPart, "current_quantity" | "target_quantity" | "code">>(
  parts: T[]
): T[] {
  return [...parts].sort((a, b) => {
    const la = LIGHT_PRIORITY[getKanbanTrafficLight(a.current_quantity, a.target_quantity)];
    const lb = LIGHT_PRIORITY[getKanbanTrafficLight(b.current_quantity, b.target_quantity)];
    if (la !== lb) return la - lb;
    const ra = a.target_quantity > 0 ? a.current_quantity / a.target_quantity : 0;
    const rb = b.target_quantity > 0 ? b.current_quantity / b.target_quantity : 0;
    if (ra !== rb) return ra - rb;
    return a.code.localeCompare(b.code, "pt-BR", { numeric: true });
  });
}

export function getActiveOrderConsumptions(movements: KanbanMovement[]): KanbanMovement[] {
  const reversedIds = new Set(
    movements
      .filter((m) => m.movement_type === "reversal" && m.reversed_movement_id)
      .map((m) => m.reversed_movement_id as string)
  );
  return movements.filter(
    (m) => m.movement_type === "consumption" && !reversedIds.has(m.id)
  );
}

export function partAppliesToMachine(
  part: Pick<KanbanPart, "is_universal" | "machine_ids" | "sector_id">,
  machineId: string | null,
  sectorId: string | null
): boolean {
  if (!sectorId || part.sector_id !== sectorId) return false;
  return part.is_universal || (machineId !== null && part.machine_ids.includes(machineId));
}

export function partAppliesToScope(
  part: Pick<KanbanPart, "is_universal" | "machine_ids" | "sector_id" | "cabinet_id">,
  sectorFilter: string,
  machineFilter: string,
  machinesMap: Map<string, { sector_id: string | null }>,
  cabinetFilter = "all"
): boolean {
  if (sectorFilter !== "all" && part.sector_id !== sectorFilter) return false;
  if (cabinetFilter !== "all" && part.cabinet_id !== cabinetFilter) return false;
  if (machineFilter === "universal") return part.is_universal;
  if (machineFilter !== "all") {
    return partAppliesToMachine(part, machineFilter, machinesMap.get(machineFilter)?.sector_id ?? null);
  }
  return true;
}

export interface KanbanPartScopeSummary {
  cabinetName: string;
  sectorName: string;
  primary: string;
  secondary: string;
  tooltip: string;
  summaryText: string;
}

export function describeKanbanPartScope(
  part: Pick<KanbanPart, "is_universal" | "machine_ids" | "sector_id" | "cabinet_id">,
  machinesMap: Map<string, { code: string; model?: string | null; sector_id: string | null }>,
  sectorsMap: Map<string, { name: string }>,
  formatMachine: (m: { code: string; model?: string | null } | undefined) => string,
  cabinetsMap?: Map<string, { name: string }>
): KanbanPartScopeSummary {
  const sectorName = part.sector_id ? sectorsMap.get(part.sector_id)?.name ?? "Setor não encontrado" : "Setor pendente";
  const cabinetName = part.cabinet_id ? cabinetsMap?.get(part.cabinet_id)?.name ?? "Armário" : "Sem armário";
  const locationLabel = part.cabinet_id ? `${cabinetName} · ${sectorName}` : sectorName;
  if (part.is_universal) {
    return {
      cabinetName,
      sectorName,
      primary: "Universal · Todas as máquinas",
      secondary: locationLabel,
      tooltip: `${cabinetName} — Todas as máquinas de ${sectorName}`,
      summaryText: `${locationLabel} · Universal`,
    };
  }

  if (part.machine_ids.length === 0) {
    return {
      cabinetName,
      sectorName,
      primary: "Sem equipamento vinculado",
      secondary: locationLabel,
      tooltip: `${cabinetName} — Nenhum equipamento vinculado`,
      summaryText: `${locationLabel} · Sem equipamento vinculado`,
    };
  }

  const linkedMachines = part.machine_ids
    .map((id) => machinesMap.get(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const labels =
    linkedMachines.length > 0
      ? linkedMachines
          .map((m) => formatMachine(m))
          .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }))
      : [`${part.machine_ids.length} equipamento(s)`];

  const secondary = locationLabel;

  if (labels.length === 1) {
    return {
      cabinetName,
      sectorName,
      primary: labels[0],
      secondary,
      tooltip: `${labels[0]} — ${secondary}`,
      summaryText: `${secondary} · ${labels[0]}`,
    };
  }

  const preview =
    labels.length <= 2 ? labels.join(", ") : `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  const fullList = labels.join(", ");

  return {
    cabinetName,
    sectorName,
    primary: `${labels.length} máquinas: ${preview}`,
    secondary,
    tooltip: `${fullList} — ${secondary}`,
    summaryText: `${secondary} · ${labels.length} máquinas (${preview})`,
  };
}