import { Navigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Wrench className="w-10 h-10 text-primary" />
        </div>

        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            CMMS Industrial
          </h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Sistema de Gestão de Manutenção para sua fábrica
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="h-12 px-8 btn-industrial">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Gerencie ordens de serviço, acompanhe KPIs e otimize sua manutenção
        </p>
      </div>
    </div>
  );
};

export default Index;
