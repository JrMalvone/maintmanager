import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import { differenceInMinutes } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface DowntimeChartProps {
  orders: ServiceOrder[];
}

export function DowntimeChart({ orders }: DowntimeChartProps) {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    supabase.from("machines").select("*").then(({ data }) => {
      if (data) setMachines(data);
    });
  }, []);

  // Calculate total downtime per machine (only stopped + closed with timestamps)
  const stoppedOrders = orders.filter(
    (o) => o.is_machine_stopped && o.status === "closed" && o.finished_at
  );

  const downtimeMap = new Map<string, number>();
  stoppedOrders.forEach((o) => {
    const mins = differenceInMinutes(new Date(o.finished_at!), new Date(o.created_at));
    downtimeMap.set(o.machine_id || "", (downtimeMap.get(o.machine_id || "") || 0) + mins);
  });

  const chartData = Array.from(downtimeMap.entries())
    .map(([machineId, mins]) => ({
      code: machines.find((m) => m.id === machineId)?.code || machineId.slice(0, 8),
      hours: Math.round(mins / 60 * 10) / 10,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const colors = [
    "hsl(var(--priority-critical))",
    "hsl(var(--priority-medium))",
    "hsl(var(--status-progress))",
    "hsl(var(--primary))",
    "hsl(var(--muted-foreground))",
  ];

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Top 5 Máquinas por Downtime</h3>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="code" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={50} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                formatter={(value) => [`${value}h`, "Downtime"]}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
