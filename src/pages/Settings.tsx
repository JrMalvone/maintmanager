import { Navigate } from "react-router-dom";
import { useAppAuth } from "@/hooks/useAppAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectorsTab } from "@/components/settings/SectorsTab";
import { MachinesTab } from "@/components/settings/MachinesTab";
import { StaffTab } from "@/components/settings/StaffTab";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { role, loading } = useAppAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== "gestor") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie setores, máquinas e equipe de manutenção
          </p>
        </div>

        <Tabs defaultValue="sectors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="sectors">Setores</TabsTrigger>
            <TabsTrigger value="machines">Máquinas</TabsTrigger>
            <TabsTrigger value="staff">Equipe</TabsTrigger>
          </TabsList>

          <TabsContent value="sectors">
            <SectorsTab />
          </TabsContent>

          <TabsContent value="machines">
            <MachinesTab />
          </TabsContent>

          <TabsContent value="staff">
            <StaffTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
