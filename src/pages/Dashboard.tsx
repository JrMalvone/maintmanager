import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect based on role
  if (role === "operator") {
    return <Navigate to="/dashboard/new-order" replace />;
  } else if (role === "technician") {
    return <Navigate to="/dashboard/orders" replace />;
  } else if (role === "manager") {
    return <Navigate to="/dashboard/analytics" replace />;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </DashboardLayout>
  );
}
