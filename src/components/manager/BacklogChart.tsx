import type { ServiceOrder } from "@/hooks/useData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { subDays, format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BacklogChartProps {
  orders: ServiceOrder[];
}

export function BacklogChart({ orders }: BacklogChartProps) {
  // Generate last 7 days data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const opened = orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), { start: dayStart, end: dayEnd })
    ).length;

    const closed = orders.filter(
      (o) =>
        o.finished_at &&
        isWithinInterval(new Date(o.finished_at), { start: dayStart, end: dayEnd })
    ).length;

    return {
      day: format(date, "EEE", { locale: ptBR }),
      date: format(date, "dd/MM"),
      abertas: opened,
      fechadas: closed,
    };
  });

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Backlog - Últimos 7 Dias</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="abertas"
              name="Abertas"
              fill="hsl(var(--status-open))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="fechadas"
              name="Fechadas"
              fill="hsl(var(--status-closed))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
