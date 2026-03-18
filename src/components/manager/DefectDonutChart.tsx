import type { ServiceOrder } from "@/hooks/useData";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DefectDonutChartProps {
  orders: ServiceOrder[];
}

export function DefectDonutChart({ orders }: DefectDonutChartProps) {
  const closed = orders.filter((o) => o.status === "closed");
  const electronic = closed.filter((o) => o.maintenance_type === "electronic").length;
  const mechanical = closed.filter((o) => o.maintenance_type === "mechanical").length;
  const other = closed.filter((o) => !o.maintenance_type).length;

  const data = [
    { name: "Elétrico", value: electronic },
    { name: "Mecânico", value: mechanical },
    ...(other > 0 ? [{ name: "Não classificado", value: other }] : []),
  ].filter((d) => d.value > 0);

  const colors = ["hsl(210, 80%, 55%)", "hsl(30, 85%, 55%)", "hsl(var(--muted-foreground))"];

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum dado disponível
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                paddingAngle={3}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
              />
              <Legend
                formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
