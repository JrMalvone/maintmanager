import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder } from "@/hooks/useData";
import { differenceInMinutes } from "date-fns";
import { User, Clock, CheckCircle } from "lucide-react";

interface TechnicianPerformanceProps {
  orders: ServiceOrder[];
}

interface TechnicianStats {
  id: string;
  name: string;
  closedCount: number;
  avgTime: number;
}

interface Profile {
  id: string;
  name: string;
}

export function TechnicianPerformance({ orders }: TechnicianPerformanceProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from("profiles").select("id, name");
      if (data) setProfiles(data);
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  // Calculate stats per technician
  const closedOrders = orders.filter(
    (o) => o.status === "closed" && o.technician_id && o.started_at && o.finished_at
  );

  const technicianStats: TechnicianStats[] = [];
  const techIds = [...new Set(closedOrders.map((o) => o.technician_id))];

  techIds.forEach((techId) => {
    if (!techId) return;
    
    const techOrders = closedOrders.filter((o) => o.technician_id === techId);
    const profile = profiles.find((p) => p.id === techId);
    
    const totalTime = techOrders.reduce((acc, order) => {
      return acc + differenceInMinutes(
        new Date(order.finished_at!),
        new Date(order.started_at!)
      );
    }, 0);

    technicianStats.push({
      id: techId,
      name: profile?.name || "Desconhecido",
      closedCount: techOrders.length,
      avgTime: Math.round(totalTime / techOrders.length),
    });
  });

  // Sort by closed count
  technicianStats.sort((a, b) => b.closedCount - a.closedCount);

  if (technicianStats.length === 0) {
    return null;
  }

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Desempenho dos Técnicos</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Técnico
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Ordens Fechadas
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Tempo Médio
              </th>
            </tr>
          </thead>
          <tbody>
            {technicianStats.map((tech, index) => (
              <tr
                key={tech.id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium">{tech.name}</span>
                    {index === 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                        Top
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-4 h-4 text-status-closed" />
                    <span className="font-bold">{tech.closedCount}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {tech.avgTime < 60
                        ? `${tech.avgTime} min`
                        : `${Math.floor(tech.avgTime / 60)}h ${tech.avgTime % 60}m`}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
