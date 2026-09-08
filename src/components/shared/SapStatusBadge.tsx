import { CheckCircle, Clock } from "lucide-react";

interface SapStatusBadgeProps {
  status: string | null;
  notificationNumber: string | null;
  syncMessage: string | null;
  compact?: boolean;
}

export function SapStatusBadge({
  notificationNumber,
  compact = false,
}: SapStatusBadgeProps) {
  if (notificationNumber) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
        <CheckCircle className="w-3 h-3" />
        {compact ? `SAP` : `Ordem SAP: ${notificationNumber}`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">
      <Clock className="w-3 h-3" />
      {compact ? "SAP" : "Aguardando integração SAP"}
    </span>
  );
}
