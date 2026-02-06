import { Navigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { getRedirectForRole } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { role, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect based on role
  if (role) {
    return <Navigate to={getRedirectForRole(role)} replace />;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </DashboardLayout>
  );
}
