import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Factory, RefreshCw, Tv } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Machine, ServiceOrder } from "@/hooks/useData";
import { SectorMultiSelect } from "@/components/technician/SectorMultiSelect";
import { TvOrderCard } from "./TvOrderCard";

interface TvSector {
  id: string;
  name: string;
}

interface ActiveWorkLog {
  order_id: string;
  technician_name: string;
}

const STORAGE_KEY = "cmms-tv-sector-ids";

function initialSectorIds(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) && parsed.every((value) => typeof value === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export function TvOrdersPanel() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sectors, setSectors] = useState<TvSector[]>([]);
  const [activeLogs, setActiveLogs] = useState<ActiveWorkLog[]>([]);
  const [sectorIds, setSectorIds] = useState<string[]>(initialSectorIds);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(new Date());
  const pauseUntil = useRef(0);
  const filterOpen = useRef(false);

  const fetchData = useCallback(async () => {
    const [ordersResult, machinesResult, sectorsResult, logsResult] = await Promise.all([
      supabase
        .from("service_orders")
        .select("*")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: true }),
      supabase.from("machines").select("*").order("code"),
      supabase.from("sectors").select("id, name").order("name"),
      supabase.from("work_logs").select("order_id, technician_name").is("ended_at", null),
    ]);

    if (ordersResult.data) setOrders(ordersResult.data as ServiceOrder[]);
    if (machinesResult.data) setMachines(machinesResult.data);
    if (sectorsResult.data) setSectors(sectorsResult.data);
    if (logsResult.data) setActiveLogs(logsResult.data);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const poll = window.setInterval(fetchData, 60000);
    const clock = window.setInterval(() => setNow(new Date()), 60000);
    const channel = supabase
      .channel("tv_active_orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_orders" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "work_logs" }, fetchData)
      .subscribe();

    return () => {
      window.clearInterval(poll);
      window.clearInterval(clock);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sectorIds));
  }, [sectorIds]);

  useEffect(() => {
    const pause = () => {
      pauseUntil.current = Date.now() + 20000;
    };
    window.addEventListener("wheel", pause, { passive: true });
    window.addEventListener("touchstart", pause, { passive: true });
    window.addEventListener("pointerdown", pause, { passive: true });
    window.addEventListener("keydown", pause);

    const scroll = window.setInterval(() => {
      if (filterOpen.current || Date.now() < pauseUntil.current) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atEnd = maxScroll <= 0 || window.scrollY >= maxScroll - 24;
      window.scrollTo({
        top: atEnd ? 0 : Math.min(window.scrollY + window.innerHeight * 0.72, maxScroll),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }, 10000);

    return () => {
      window.clearInterval(scroll);
      window.removeEventListener("wheel", pause);
      window.removeEventListener("touchstart", pause);
      window.removeEventListener("pointerdown", pause);
      window.removeEventListener("keydown", pause);
    };
  }, []);

  const machineById = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines]);
  const teamByOrder = useMemo(() => {
    const result = new Map<string, string[]>();
    activeLogs.forEach((log) => {
      const names = result.get(log.order_id) ?? [];
      if (!names.includes(log.technician_name)) names.push(log.technician_name);
      result.set(log.order_id, names);
    });
    return result;
  }, [activeLogs]);

  const filteredOrders = orders.filter((order) => {
    if (sectorIds.length === 0) return true;
    const machine = order.machine_id ? machineById.get(order.machine_id) : undefined;
    return Boolean(machine?.sector_id && sectorIds.includes(machine.sector_id));
  });

  const groups = sectors
    .map((sector) => ({
      ...sector,
      orders: filteredOrders.filter((order) => {
        const machine = order.machine_id ? machineById.get(order.machine_id) : undefined;
        return machine?.sector_id === sector.id;
      }),
    }))
    .filter((sector) => sector.orders.length > 0);
  const knownOrderIds = new Set(groups.flatMap((group) => group.orders.map((order) => order.id)));
  const ungrouped = filteredOrders.filter((order) => !knownOrderIds.has(order.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Tv className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Ordens de Serviço Ativas</h1>
              <p className="text-sm text-muted-foreground">
                {filteredOrders.length} {filteredOrders.length === 1 ? "ordem exibida" : "ordens exibidas"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SectorMultiSelect
              sectors={sectors}
              selected={sectorIds}
              onChange={setSectorIds}
              onOpenChange={(open) => { filterOpen.current = open; }}
              className="sm:h-11 sm:w-[280px] text-base"
            />
            <div className="hidden text-right text-sm text-muted-foreground sm:block">
              <div className="flex items-center justify-end gap-1.5 text-status-closed">
                <RefreshCw className="h-3.5 w-3.5" /> Atualização automática
              </div>
              {lastUpdated && <div>{lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-9 px-5 py-6">
        {filteredOrders.length === 0 ? (
          <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
            <ClipboardList className="mb-5 h-20 w-20 text-muted-foreground/40" />
            <p className="text-2xl font-semibold">Nenhuma ordem ativa nos setores selecionados</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.id} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <Factory className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold uppercase">{group.name}</h2>
                  <span className="text-lg text-muted-foreground">({group.orders.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {group.orders.map((order) => (
                    <TvOrderCard
                      key={order.id}
                      order={order}
                      machine={order.machine_id ? machineById.get(order.machine_id) : undefined}
                      team={teamByOrder.get(order.id) ?? (order.technician_name ? [order.technician_name] : [])}
                      now={now}
                    />
                  ))}
                </div>
              </section>
            ))}
            {ungrouped.length > 0 && (
              <section className="space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="text-2xl font-bold uppercase">Sem setor</h2>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {ungrouped.map((order) => (
                    <TvOrderCard
                      key={order.id}
                      order={order}
                      machine={order.machine_id ? machineById.get(order.machine_id) : undefined}
                      team={teamByOrder.get(order.id) ?? (order.technician_name ? [order.technician_name] : [])}
                      now={now}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}