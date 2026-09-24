import type { ServiceOrder, Machine } from "@/hooks/useData";
import { machineLabel } from "@/lib/machineLabel";
import { formatDateTime } from "@/lib/dateUtils";
import { AlertTriangle, Clock, CalendarIcon, X, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CriticalDowntimeTableProps {
  orders: ServiceOrder[];
  machines: Machine[];
  onOrderClick: (order: ServiceOrder) => void;
}

interface CriticalEvent {
  order: ServiceOrder;
  machineName: string;
  downtimeMinutes: number;
}

export function CriticalDowntimeTable({ orders, machines, onOrderClick }: CriticalDowntimeTableProps) {
  const [day, setDay] = useState<Date | undefined>(undefined);

  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach((m) => map.set(m.id, m));
    return map;
  }, [machines]);

  const criticalEvents = useMemo(() => {
    const events: CriticalEvent[] = [];

    for (const order of orders) {
      if (order.status !== "closed" || !order.is_machine_stopped || !order.finished_at) continue;
      if (day && !isSameDay(new Date(order.created_at), day)) continue;
      const start = new Date(order.created_at);
      const end = new Date(order.finished_at);
      const downtimeMinutes = (end.getTime() - start.getTime()) / 60000;

      if (!Number.isFinite(downtimeMinutes) || downtimeMinutes <= 180) continue;

      const machine = order.machine_id ? machineMap.get(order.machine_id) : null;

      events.push({
        order,
        machineName: machineLabel(machine),
        downtimeMinutes,
      });
    }

    events.sort((a, b) => b.downtimeMinutes - a.downtimeMinutes);
    return events;
  }, [orders, machineMap, day]);

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}min`;
  }

  return (
    <div className="industrial-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-semibold">Paradas Acima de 3 Horas</h3>
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("justify-start text-left font-normal", day && "border-primary text-primary")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {day ? format(day, "dd/MM/yyyy", { locale: ptBR }) : "Filtrar por dia"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={day}
                onSelect={setDay}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          {day && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDay(undefined)}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {criticalEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhuma parada acima de 3 horas no período selecionado.
        </p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Máquina</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Data Abertura</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Problema</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tempo Parado</th>
            </tr>
          </thead>
          <tbody>
            {criticalEvents.map(({ order, machineName, downtimeMinutes }) => (
              <tr key={order.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onOrderClick(order)}>
                <td className="py-3 px-4 text-sm font-medium">
                  <Button variant="link" className="h-auto p-0 text-left whitespace-normal text-primary" onClick={(event) => { event.stopPropagation(); onOrderClick(order); }} aria-label={`Ver detalhes da ordem da máquina ${machineName}`}>
                    {machineName} <ArrowUpRight className="h-4 w-4 shrink-0" />
                  </Button>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(order.created_at)}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className="status-badge-closed">Fechada</span>
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                  {order.problem_description.length > 50
                    ? order.problem_description.slice(0, 50) + "…"
                    : order.problem_description}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-bold text-destructive">{formatDuration(downtimeMinutes)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
