import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { toast } from "sonner";

export type PreventivePlan = Tables<"preventive_plans">;
export function usePreventivePlans() {
  const [plans, setPlans] = useState<PreventivePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const refetch = useCallback(async () => {
    const result = await fetchAllRows((from,to) => supabase.from("preventive_plans").select("*").order("next_due_date").order("id").range(from,to));
    if (result.error) toast.error("Não foi possível carregar os planos preventivos.");
    else setPlans(result.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    refetch();
    const timer = window.setInterval(refetch, 60000);
    const onFocus = () => refetch();
    window.addEventListener("focus",onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus",onFocus); };
  }, [refetch]);
  return { plans, loading, refetch };
}