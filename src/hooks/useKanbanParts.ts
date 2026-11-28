import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type {
  KanbanCabinet,
  KanbanCategory,
  KanbanMovement,
  KanbanOrderType,
  KanbanPart,
} from "@/lib/kanbanParts";

export interface KanbanCabinetInput {
  sector_id: string;
  name: string;
  location?: string | null;
}

export interface KanbanPartInput {
  sector_id: string;
  cabinet_id: string;
  is_universal: boolean;
  machine_ids: string[];
  code: string;
  description: string;
  category: KanbanCategory;
  target_quantity: number;
  current_quantity: number;
}

type RawKanbanPartRow = Omit<KanbanPart, "machine_ids">;

function hydratePart(row: RawKanbanPartRow, linksMap: Map<string, string[]>): KanbanPart {
  if (row.is_universal) {
    return { ...row, machine_ids: [] };
  }
  const linked = linksMap.get(row.id) ?? [];
  const machineIds =
    linked.length > 0 ? linked : row.machine_id ? [row.machine_id] : [];
  return { ...row, machine_ids: machineIds };
}

export function useKanbanParts() {
  const [parts, setParts] = useState<KanbanPart[]>([]);
  const [cabinets, setCabinets] = useState<KanbanCabinet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParts = useCallback(async () => {
    const [cabinetsRes, partsRes, linksRes] = await Promise.all([
      fetchAllRows((from, to) =>
        supabase
          .from("kanban_cabinets")
          .select("*")
          .order("name", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from("kanban_parts")
          .select("*")
          .order("code", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
      ),
      fetchAllRows((from, to) =>
        supabase
          .from("kanban_part_machines")
          .select("part_id, machine_id")
          .order("part_id", { ascending: true })
          .order("machine_id", { ascending: true })
          .range(from, to)
      ),
    ]);

    if (!cabinetsRes.error && cabinetsRes.data) {
      setCabinets(cabinetsRes.data as KanbanCabinet[]);
    }

    if (!partsRes.error && partsRes.data) {
      const linksMap = new Map<string, string[]>();
      if (!linksRes.error && linksRes.data) {
        for (const row of linksRes.data as { part_id: string; machine_id: string }[]) {
          const list = linksMap.get(row.part_id) ?? [];
          list.push(row.machine_id);
          linksMap.set(row.part_id, list);
        }
      }
      setParts(
        (partsRes.data as RawKanbanPartRow[]).map((row) => hydratePart(row, linksMap))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchParts();
    const onFocus = () => fetchParts();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(fetchParts, 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [fetchParts]);

  const createCabinet = async (input: KanbanCabinetInput): Promise<KanbanCabinet> => {
    const { data, error } = await supabase
      .from("kanban_cabinets")
      .insert({
        sector_id: input.sector_id,
        name: input.name.trim(),
        location: input.location?.trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um armário (Kanban) com este nome neste setor.");
      }
      throw error;
    }
    await fetchParts();
    return data as KanbanCabinet;
  };

  const updateCabinet = async (id: string, input: KanbanCabinetInput): Promise<KanbanCabinet> => {
    const { data, error } = await supabase
      .from("kanban_cabinets")
      .update({
        sector_id: input.sector_id,
        name: input.name.trim(),
        location: input.location?.trim() || null,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe um armário (Kanban) com este nome neste setor.");
      }
      throw error;
    }
    await fetchParts();
    return data as KanbanCabinet;
  };

  const deleteCabinet = async (id: string) => {
    const { error } = await supabase.from("kanban_cabinets").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        throw new Error(
          "Não é possível excluir um armário que possui peças cadastradas. Remova ou mova as peças primeiro."
        );
      }
      throw error;
    }
    await fetchParts();
  };

  const createPart = async (input: KanbanPartInput) => {
    const machineIds = input.is_universal
      ? []
      : Array.from(new Set(input.machine_ids.filter(Boolean)));

    const { data, error } = await supabase
      .from("kanban_parts")
      .insert({
        sector_id: input.sector_id,
        cabinet_id: input.cabinet_id,
        is_universal: input.is_universal,
        machine_id: input.is_universal ? null : machineIds[0] ?? null,
        code: input.code.trim(),
        description: input.description.trim(),
        category: input.category,
        target_quantity: input.target_quantity,
        current_quantity: input.current_quantity,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (!input.is_universal && machineIds.length > 0 && data?.id) {
      const { error: linkError } = await supabase
        .from("kanban_part_machines")
        .insert(machineIds.map((machine_id) => ({ part_id: data.id, machine_id })));
      if (linkError) {
        await supabase.from("kanban_parts").delete().eq("id", data.id);
        throw linkError;
      }
    }
    await fetchParts();
  };

  const updatePart = async (id: string, input: KanbanPartInput) => {
    const machineIds = input.is_universal
      ? []
      : Array.from(new Set(input.machine_ids.filter(Boolean)));

    const { error } = await supabase
      .from("kanban_parts")
      .update({
        sector_id: input.sector_id,
        cabinet_id: input.cabinet_id,
        is_universal: input.is_universal,
        machine_id: input.is_universal ? null : machineIds[0] ?? null,
        code: input.code.trim(),
        description: input.description.trim(),
        category: input.category,
        target_quantity: input.target_quantity,
        current_quantity: input.current_quantity,
      })
      .eq("id", id);
    if (error) throw error;

    if (input.is_universal) {
      const { error: delError } = await supabase
        .from("kanban_part_machines")
        .delete()
        .eq("part_id", id);
      if (delError) throw delError;
    } else {
      const { data: existingRows, error: readErr } = await supabase
        .from("kanban_part_machines")
        .select("machine_id")
        .eq("part_id", id);
      if (readErr) throw readErr;

      const existingSet = new Set((existingRows ?? []).map((r) => r.machine_id));
      const nextSet = new Set(machineIds);
      const toAdd = machineIds.filter((mId) => !existingSet.has(mId));
      const toRemove = Array.from(existingSet).filter((mId) => !nextSet.has(mId));

      if (toAdd.length > 0) {
        const { error: addErr } = await supabase
          .from("kanban_part_machines")
          .insert(toAdd.map((machine_id) => ({ part_id: id, machine_id })));
        if (addErr) throw addErr;
      }
      if (toRemove.length > 0) {
        const { error: remErr } = await supabase
          .from("kanban_part_machines")
          .delete()
          .eq("part_id", id)
          .in("machine_id", toRemove);
        if (remErr) throw remErr;
      }
    }
    await fetchParts();
  };

  const deletePart = async (id: string) => {
    const { error } = await supabase.from("kanban_parts").delete().eq("id", id);
    if (error) throw error;
    await fetchParts();
  };

  const replenishPart = async (
    partId: string,
    quantity: number,
    actorName?: string,
    notes?: string
  ) => {
    const { data, error } = await supabase.rpc("replenish_kanban_part", {
      p_part_id: partId,
      p_quantity: quantity,
      p_actor_name: actorName ?? null,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    await fetchParts();
    return data as unknown as KanbanMovement;
  };

  return {
    cabinets,
    parts,
    loading,
    refetch: fetchParts,
    createCabinet,
    updateCabinet,
    deleteCabinet,
    createPart,
    updatePart,
    deletePart,
    replenishPart,
  };
}

export function useOrderKanbanParts(
  orderId: string | null,
  orderType: KanbanOrderType,
  machineId: string | null
) {
  const [cabinets, setCabinets] = useState<KanbanCabinet[]>([]);
  const [machineParts, setMachineParts] = useState<KanbanPart[]>([]);
  const [extraParts, setExtraParts] = useState<KanbanPart[]>([]);
  const [orderMovements, setOrderMovements] = useState<KanbanMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orderId) {
      setCabinets([]);
      setMachineParts([]);
      setExtraParts([]);
      setOrderMovements([]);
      return;
    }
    setLoading(true);

    // Resolve scope from the actual order, including preventive orders without a machine.
    let sectorId: string | null = null;
    if (orderType === "corrective" && machineId) {
      const { data } = await supabase.from("machines").select("sector_id").eq("id", machineId).maybeSingle();
      sectorId = data?.sector_id ?? null;
    } else if (orderType !== "corrective") {
      const { data } = await supabase.from("preventive_backlog_orders").select("sector_id").eq("id", orderId).maybeSingle();
      sectorId = data?.sector_id ?? null;
    }
    const filterColumn = orderType === "corrective" ? "corrective_order_id" : "preventive_order_id";
    const [cabinetsRes, partsRes, linkedRes, movRes] = await Promise.all([
      sectorId
        ? fetchAllRows((from, to) =>
            supabase
              .from("kanban_cabinets")
              .select("*")
              .eq("sector_id", sectorId)
              .order("name", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to)
          )
        : Promise.resolve({ data: [], error: null }),
      sectorId ? fetchAllRows((from, to) => supabase.from("kanban_parts").select("*").eq("sector_id", sectorId).order("id").range(from, to)) : Promise.resolve({ data: [], error: null }),
      machineId ? fetchAllRows((from, to) => supabase.from("kanban_part_machines").select("part_id").eq("machine_id", machineId).order("part_id").range(from, to)) : Promise.resolve({ data: [], error: null }),
      supabase.from("kanban_movements").select("*").eq(filterColumn, orderId).order("created_at", { ascending: false }),
    ]);
    const sectorCabinets = (cabinetsRes.data ?? []) as KanbanCabinet[];
    const cabinetsNameMap = new Map(sectorCabinets.map((c) => [c.id, c.name]));
    const linkedPartIds = new Set((linkedRes.data ?? []).map((r) => r.part_id));
    const availableMap = new Map<string, KanbanPart>();
    for (const row of (partsRes.data ?? []) as RawKanbanPartRow[]) {
      if (row.is_universal || linkedPartIds.has(row.id) || (machineId && row.machine_id === machineId)) {
        availableMap.set(row.id, { ...row, machine_ids: row.is_universal ? [] : machineId ? [machineId] : [] });
      }
    }

    const sortedAvailable = Array.from(availableMap.values()).sort((a, b) => {
      const cabA = a.cabinet_id ? cabinetsNameMap.get(a.cabinet_id) ?? "" : "";
      const cabB = b.cabinet_id ? cabinetsNameMap.get(b.cabinet_id) ?? "" : "";
      const cabCmp = cabA.localeCompare(cabB, "pt-BR", { numeric: true });
      if (cabCmp !== 0) return cabCmp;
      if (a.is_universal !== b.is_universal) return a.is_universal ? 1 : -1;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.code.localeCompare(b.code, "pt-BR", { numeric: true });
    });
    setMachineParts(sortedAvailable);

    const movements = (!movRes.error && movRes.data ? movRes.data : []) as KanbanMovement[];
    setOrderMovements(movements);

    const missingPartIds = Array.from(
      new Set(movements.map((m) => m.part_id).filter((pid) => !availableMap.has(pid)))
    );
    let mergedCabinets = sectorCabinets;
    if (missingPartIds.length > 0) {
      const { data: missingRows } = await supabase
        .from("kanban_parts")
        .select("*")
        .in("id", missingPartIds);
      const hydratedMissing = ((missingRows as RawKanbanPartRow[]) ?? []).map((row) => ({
        ...row,
        machine_ids: [],
      }));
      setExtraParts(hydratedMissing);
      const knownCabIds = new Set(sectorCabinets.map((c) => c.id));
      const missingCabIds = Array.from(
        new Set(
          hydratedMissing
            .map((p) => p.cabinet_id)
            .filter((cid): cid is string => Boolean(cid) && !knownCabIds.has(cid))
        )
      );
      if (missingCabIds.length > 0) {
        const { data: extraCabRows } = await supabase
          .from("kanban_cabinets")
          .select("*")
          .in("id", missingCabIds);
        if (extraCabRows) {
          mergedCabinets = [...sectorCabinets, ...(extraCabRows as KanbanCabinet[])];
        }
      }
    } else {
      setExtraParts([]);
    }
    setCabinets(mergedCabinets);

    setLoading(false);
  }, [orderId, orderType, machineId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recordConsumption = async (
    partId: string,
    quantity: number,
    actorName?: string,
    notes?: string
  ) => {
    if (!orderId) throw new Error("Ordem inválida");
    const { data, error } = await supabase.rpc("record_kanban_consumption", {
      p_part_id: partId,
      p_quantity: quantity,
      p_order_type: orderType,
      p_order_id: orderId,
      p_actor_name: actorName ?? null,
      p_notes: notes ?? null,
    });
    if (error) throw error;
    await fetchData();
    return data as unknown as KanbanMovement;
  };

  const reverseConsumption = async (movementId: string, actorName?: string) => {
    const { data, error } = await supabase.rpc("reverse_kanban_consumption", {
      p_movement_id: movementId,
      p_actor_name: actorName ?? null,
    });
    if (error) throw error;
    await fetchData();
    return data as unknown as KanbanMovement;
  };

  return {
    cabinets,
    machineParts,
    extraParts,
    orderMovements,
    loading,
    refetch: fetchData,
    recordConsumption,
    reverseConsumption,
  };
}