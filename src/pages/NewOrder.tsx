import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ServiceOrderForm } from "@/components/operator/ServiceOrderForm";
import { PreventiveOrderForm } from "@/components/operator/PreventiveOrderForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, CalendarCheck } from "lucide-react";

export default function NewOrderPage() {
  return (
    <DashboardLayout>
      <Tabs defaultValue="corrective" className="max-w-2xl mx-auto space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1">
          <TabsTrigger value="corrective" className="h-10 gap-2 text-sm font-semibold">
            <Wrench className="w-4 h-4" />
            Corretiva
          </TabsTrigger>
          <TabsTrigger value="preventive" className="h-10 gap-2 text-sm font-semibold">
            <CalendarCheck className="w-4 h-4" />
            Preventiva / Backlog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="corrective" className="mt-0">
          <ServiceOrderForm />
        </TabsContent>

        <TabsContent value="preventive" className="mt-0">
          <PreventiveOrderForm />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
