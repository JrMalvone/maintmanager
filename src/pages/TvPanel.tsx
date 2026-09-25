import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAppAuth } from "@/hooks/useAppAuth";
import { TvOrdersPanel } from "@/components/tv/TvOrdersPanel";

export default function TvPanelPage() {
  const { isAuthenticated, role, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== "manutencao" && role !== "gestor") {
    return <Navigate to="/dashboard" replace />;
  }

  return <TvOrdersPanel />;
}