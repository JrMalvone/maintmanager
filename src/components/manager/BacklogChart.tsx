import type { ServiceOrder } from "@/hooks/useData";
import type { DateFilter } from "./DashboardFilters";
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
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BacklogChartProps {
  orders: ServiceOrder[];
  dateFilter: DateFilter;
}

export function BacklogChart({ orders, dateFilter }: BacklogChartProps) {
  const { start, end } = dateFilter;
  const totalDays = differenceInDays(end, start);

  let chartData: { label: string; abertas: number; fechadas: number }[];

  if (totalDays <= 14) {
    // Daily buckets
    const days = eachDayOfInterval({ start, end });
    chartData = days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return {
        label: format(day, "dd/MM"),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: dayStart, end: dayEnd })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: dayStart, end: dayEnd })).length,
      };
    });
  } else if (totalDays <= 90) {
    // Weekly buckets
    const weeks = eachWeekOfInterval({ start, end }, { locale: ptBR });
    chartData = weeks.map((weekStart) => {
      const wStart = startOfWeek(weekStart, { locale: ptBR });
      const wEnd = endOfWeek(weekStart, { locale: ptBR });
      return {
        label: format(wStart, "dd/MM"),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: wStart, end: wEnd })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: wStart, end: wEnd })).length,
      };
    });
  } else {
    // Monthly buckets
    const months = eachMonthOfInterval({ start, end });
    chartData = months.map((month) => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      return {
        label: format(month, "MMM/yy", { locale: ptBR }),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: mStart, end: mEnd })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: mStart, end: mEnd })).length,
      };
    });
  }

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Backlog - Abertas vs Fechadas</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="label"
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
            <Bar dataKey="abertas" name="Abertas" fill="hsl(var(--status-open))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fechadas" name="Fechadas" fill="hsl(var(--status-closed))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
