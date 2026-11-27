import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PreventivePlan } from "@/hooks/usePreventivePlans";
import { useMachines, useSectors } from "@/hooks/useData";
import { PERIODICITIES, Periodicity } from "@/lib/preventiveSchedule";
import { PREVENTIVE_MAINTENANCE_LABELS, PREVENTIVE_PRIORITY_LABELS, resolvePreventiveWorkCenter, PreventiveMaintenanceType } from "@/lib/preventiveOrders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

export function PreventivePlanEditor({plan,onClose,onSaved}: {plan:PreventivePlan;onClose:()=>void;onSaved:()=>void}) {
  const [draft,setDraft] = useState(plan);
  const [saving,setSaving] = useState(false);
  const {sectors} = useSectors();
  const {machines} = useMachines(undefined,false);
  const field = <K extends keyof PreventivePlan>(key:K,value:PreventivePlan[K]) => setDraft(p=>({...p,[key]:value}));
  const selector = (id:string,label:string,value:string,items:Record<string,string>,change:(v:string)=>void) => <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={change}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(items).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>;
  async function save(e:React.FormEvent) {
    e.preventDefault();setSaving(true);
    const machine=machines.find(m=>m.id===draft.machine_id);
    const sector=sectors.find(s=>s.id===draft.sector_id);
    const {error}=await supabase.from("preventive_plans").update({
      title:draft.title.trim(),description:draft.description.trim(),periodicity:draft.periodicity,next_due_date:draft.next_due_date,
      active:draft.active,priority:draft.priority,maintenance_type:draft.maintenance_type,sector_id:draft.sector_id,machine_id:draft.machine_id,
      machine_number:machine?.code??null,materials_needed:draft.materials_needed,estimated_minutes:draft.estimated_minutes,
      opener_name:draft.opener_name,opener_registry:draft.opener_registry,
      work_center:resolvePreventiveWorkCenter(draft.maintenance_type as PreventiveMaintenanceType,sector),
    }).eq("id",plan.id);
    setSaving(false);
    if(error) {toast.error(error.message);return;}
    toast.success("Plano preventivo atualizado");onSaved();onClose();
  }
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Plano Preventivo</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      <div className="space-y-1.5"><Label htmlFor="planTitle">Atividade</Label><Input id="planTitle" required minLength={3} value={draft.title} onChange={e=>field("title",e.target.value)} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {selector("planPeriod","Periodicidade",draft.periodicity,Object.fromEntries(Object.entries(PERIODICITIES).map(([k,v])=>[k,v.label])),v=>field("periodicity",v as Periodicity))}
        <div className="space-y-1.5"><Label htmlFor="planDate">Próxima execução</Label><Input id="planDate" required type="date" value={draft.next_due_date} onChange={e=>field("next_due_date",e.target.value)}/></div>
        {selector("planSector","Setor",draft.sector_id??"none",{none:"Sem setor",...Object.fromEntries(sectors.map(s=>[s.id,s.name]))},v=>{field("sector_id",v==="none"?null:v);field("machine_id",null);})}
        {selector("planMachine","Equipamento",draft.machine_id??"none",{none:"Geral do setor",...Object.fromEntries(machines.filter(m=>m.sector_id===draft.sector_id).map(m=>[m.id,`${m.code} ${m.model??""}`]))},v=>field("machine_id",v==="none"?null:v))}
        {selector("planMaintenance","Tipo de manutenção",draft.maintenance_type,PREVENTIVE_MAINTENANCE_LABELS,v=>field("maintenance_type",v))}
        {selector("planPriority","Prioridade",draft.priority,PREVENTIVE_PRIORITY_LABELS,v=>field("priority",v))}
        <div className="space-y-1.5"><Label htmlFor="planEstimate">Tempo estimado (min)</Label><Input id="planEstimate" type="number" min={1} value={draft.estimated_minutes??""} onChange={e=>field("estimated_minutes",e.target.value?Number(e.target.value):null)} /></div>
        <div className="flex items-center gap-3"><Switch id="planActive" checked={draft.active} onCheckedChange={v=>field("active",v)}/><Label htmlFor="planActive">Plano ativo</Label></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="planDescription">Descrição</Label><Textarea id="planDescription" required minLength={5} value={draft.description} onChange={e=>field("description",e.target.value)}/></div>
      <div className="space-y-1.5"><Label htmlFor="planMaterials">Materiais necessários</Label><Textarea id="planMaterials" value={draft.materials_needed??""} onChange={e=>field("materials_needed",e.target.value)}/></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="planOpener">Solicitante</Label><Input id="planOpener" required value={draft.opener_name} onChange={e=>field("opener_name",e.target.value)}/></div><div><Label htmlFor="planRegistry">Matrícula</Label><Input id="planRegistry" required value={draft.opener_registry} onChange={e=>field("opener_registry",e.target.value)}/></div></div>
      <Button type="submit" disabled={saving} className="w-full">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4 mr-2"/>}Salvar plano</Button>
    </form>
  </DialogContent></Dialog>;
}