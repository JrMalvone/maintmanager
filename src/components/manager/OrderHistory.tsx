import type { ServiceOrder } from "@/hooks/useData";
import { formatDateTime } from "@/lib/dateUtils";
import { STATUS_LABELS, MAINTENANCE_TYPE_LABELS } from "@/lib/constants";
import { 
  User, 
  Wrench, 
  Clock, 
  Zap, 
  Settings,
  CheckCircle 
} from "lucide-react";

interface OrderHistoryProps {
  orders: ServiceOrder[];
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  // Show only closed orders for history
  const closedOrders = orders.filter((o) => o.status === "closed").slice(0, 10);

  if (closedOrders.length === 0) {
    return null;
  }

  return (
    <div className="industrial-card p-6">
      <h3 className="text-lg font-semibold mb-4">Histórico de Ordens (Últimas 10)</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                ID
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Tipo
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Aberto por
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                Resolvido por
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {closedOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
              >
                {/* ID */}
                <td className="py-3 px-4">
                  <span className="font-mono text-sm">#{order.id.slice(0, 8)}</span>
                </td>

                {/* Maintenance Type */}
                <td className="py-3 px-4">
                  {order.maintenance_type === "electronic" ? (
                    <span className="inline-flex items-center gap-1 text-sm text-blue-500">
                      <Zap className="w-4 h-4" />
                      Elétrico
                    </span>
                  ) : order.maintenance_type === "mechanical" ? (
                    <span className="inline-flex items-center gap-1 text-sm text-orange-500">
                      <Settings className="w-4 h-4" />
                      Mecânico
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                {/* Opener */}
                <td className="py-3 px-4">
                  {order.opener_name ? (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{order.opener_name}</p>
                        {order.opener_registry && (
                          <p className="text-xs text-muted-foreground">{order.opener_registry}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                {/* Technician */}
                <td className="py-3 px-4">
                  {order.technician_name ? (
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-status-closed" />
                      <div>
                        <p className="text-sm font-medium">{order.technician_name}</p>
                        {order.technician_registry && (
                          <p className="text-xs text-muted-foreground">{order.technician_registry}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 status-badge-closed">
                    <CheckCircle className="w-3 h-3" />
                    {STATUS_LABELS[order.status]}
                  </span>
                </td>

                {/* Date */}
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(order.finished_at || order.created_at)}
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
