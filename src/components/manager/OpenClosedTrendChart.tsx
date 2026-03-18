import type { ServiceOrder } from "@/hooks/useData";
import type { DateFilter } from "./DashboardFilters";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, differenceInDays, format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface OpenClosedTrendChartProps {
  orders: ServiceOrder[];
  dateFilter: DateFilter;
}

export function OpenClosedTrendChart({ orders, dateFilter }: OpenClosedTrendChartProps) {
  const { start, end } = dateFilter;
  const totalDays = differenceInDays(end, start);

  let chartData: { label: string; abertas: number; fechadas: number }[];

  if (totalDays <= 14) {
    const days = eachDayOfInterval({ start, end });
    chartData = days.map((day) => {
      const s = startOfDay(day), e = endOfDay(day);
      return {
        label: format(day, "dd/MM"),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: s, end: e })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: s, end: e })).length,
      };
    });
  } else if (totalDays <= 90) {
    const weeks = eachWeekOfInterval({ start, end }, { locale: ptBR });
    chartData = weeks.map((ws) => {
      const s = startOfWeek(ws, { locale: ptBR }), e = endOfWeek(ws, { locale: ptBR });
      return {
        label: format(s, "dd/MM"),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: s, end: e })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: s, end: e })).length,
      };
    });
  } else {
    const months = eachMonthOfInterval({ start, end });
    chartData = months.map((m) => {
      const s = startOfMonth(m), e = endOfMonth(m);
      return {
        label: format(m, "MMM/yy", { locale: ptBR }),
        abertas: orders.filter((o) => isWithinInterval(new Date(o.created_at), { start: s, end: e })).length,
        fechadas: orders.filter((o) => o.finished_at && isWithinInterval(new Date(o.finished_at), { start: s, end: e })).length,
      };
    });
  }

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Tendência: Abertas vs Fechadas</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Legend />
            <Line type="monotone" dataKey="abertas" name="Abertas" stroke="hsl(var(--status-open))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="fechadas" name="Fechadas" stroke="hsl(var(--status-closed))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
