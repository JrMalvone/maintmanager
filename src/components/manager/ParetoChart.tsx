import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ParetoChartProps {
  orders: ServiceOrder[];
}

interface MachineCount {
  code: string;
  count: number;
}

export function ParetoChart({ orders }: ParetoChartProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMachines() {
      const { data } = await supabase.from("machines").select("*");
      if (data) setMachines(data);
      setLoading(false);
    }
    fetchMachines();
  }, []);

  // Count orders per machine
  const machineCounts: MachineCount[] = machines
    .map((machine) => ({
      code: machine.code,
      count: orders.filter((o) => o.machine_id === machine.id).length,
    }))
    .filter((m) => m.count > 0)
    .sort((a, b) => b.count - a.count)
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
      <h3 className="text-lg font-semibold mb-4">Top 5 Máquinas com Mais Falhas</h3>
      {machineCounts.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={machineCounts}
              layout="vertical"
              margin={{ top: 20, right: 20, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value) => [`${value} ordens`, "Total"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {machineCounts.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
