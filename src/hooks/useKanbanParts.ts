import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAllRows";
import type {
  KanbanCategory,
  KanbanMovement,
  KanbanOrderType,
  KanbanPart,
} from "@/lib/kanbanParts";

export interface KanbanPartInput {
  machine_id: string;
  code: string;
  description: string;
  category: KanbanCategory;
  target_quantity: number;
  current_quantity: number;
}

export function useKanbanParts() {
  const [parts, setParts] = useState<KanbanPart[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParts = useCallback(async () => {
    const { data, error } = await fetchAllRows((from, to) =>
      supabase
        .from("kanban_parts")
        .select("*")
        .order("code", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    );
    if (!error && data) {
      setParts(data as KanbanPart[]);
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

  const createPart = async (input: KanbanPartInput) => {
    const { error } = await supabase.from("kanban_parts").insert({
      machine_id: input.machine_id,
      code: input.code.trim(),
      description: input.description.trim(),
      category: input.category,
      target_quantity: input.target_quantity,
      current_quantity: input.current_quantity,
    });
    if (error) throw error;
    await fetchParts();
  };

  const updatePart = async (id: string, input: KanbanPartInput) => {
    const { error } = await supabase
      .from("kanban_parts")
      .update({
        machine_id: input.machine_id,
        code: input.code.trim(),
        description: input.description.trim(),
        category: input.category,
        target_quantity: input.target_quantity,
        current_quantity: input.current_quantity,
      })
      .eq("id", id);
    if (error) throw error;
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
    parts,
    loading,
    refetch: fetchParts,
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
  const [machineParts, setMachineParts] = useState<KanbanPart[]>([]);
  const [orderMovements, setOrderMovements] = useState<KanbanMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!orderId) {
      setMachineParts([]);
      setOrderMovements([]);
      return;
    }
    setLoading(true);
    const partsPromise = machineId
      ? supabase
          .from("kanban_parts")
          .select("*")
          .eq("machine_id", machineId)
          .order("category", { ascending: true })
          .order("code", { ascending: true })
      : Promise.resolve({ data: [], error: null });

    const filterColumn =
      orderType === "corrective" ? "corrective_order_id" : "preventive_order_id";
    const movPromise = supabase
      .from("kanban_movements")
      .select("*")
      .eq(filterColumn, orderId)
      .order("created_at", { ascending: false });

    const [partsRes, movRes] = await Promise.all([partsPromise, movPromise]);
    if (!partsRes.error && partsRes.data) {
      setMachineParts(partsRes.data as KanbanPart[]);
    }
    if (!movRes.error && movRes.data) {
      setOrderMovements(movRes.data as KanbanMovement[]);
    }
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
    machineParts,
    orderMovements,
    loading,
    refetch: fetchData,
    recordConsumption,
    reverseConsumption,
  };
}