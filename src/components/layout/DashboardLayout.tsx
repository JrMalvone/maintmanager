import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "./Sidebar";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function DashboardLayout({ children, requiredRoles }: DashboardLayoutProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="container py-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
