import { useEffect, useMemo, useState } from "react";
import { addMonths, differenceInCalendarDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreventivePlans, PreventivePlan } from "@/hooks/usePreventivePlans";
import { usePreventiveOrders } from "@/hooks/usePreventiveOrders";
import { useMachines, useSectors } from "@/hooks/useData";
import { SectorMultiSelect } from "@/components/technician/SectorMultiSelect";
import { PreventiveOrderDetailSheet } from "@/components/preventive/PreventiveOrderDetailSheet";
import { PreventivePlanEditor } from "@/components/preventive/PreventivePlanEditor";
import { PERIODICITIES, Periodicity, projectPreventiveDates, dateKey, isInReleaseWindow } from "@/lib/preventiveSchedule";
import { PreventiveOrder, PREVENTIVE_MAINTENANCE_LABELS, formatEstimatedMinutes, getPreventiveOrderDelayInfo } from "@/lib/preventiveOrders";
import { AlertTriangle, ChevronLeft, ChevronRight, CalendarDays, ClipboardList, Loader2, Search, ShoppingCart, TimerOff } from "lucide-react";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  date: string;
  title: string;
  plan?: PreventivePlan;
  order?: PreventiveOrder;
  status: string;
  machine: string;
  isDateOverdue: boolean;
  daysOverdue: number;
  isPartsOverdue: boolean;
  partsDaysOverdue: number;
  partsExpectedDate?: string | null;
  isTimeExceeded: boolean;
  overtimeMinutes: number;
};
const statusStyle: Record<string, string> = {
  Projetada: "text-muted-foreground border-border",
  Programada: "text-primary border-primary/50",
  "Aguardando peças": "text-status-open border-status-open bg-status-open/10",
  "Em andamento": "text-status-progress border-status-progress/50",
  Concluída: "text-status-closed border-status-closed/50",
  "Data vencida": "text-destructive border-destructive bg-destructive/10",
  "Tempo excedido": "text-status-open border-status-open bg-status-open/10",
  Cancelada: "text-muted-foreground border-border",
};

function CalendarContent() {
  const {plans,loading,refetch:refetchPlans} = usePreventivePlans();
  const {orders,loading:loadingOrders,refetch:refetchOrders} = usePreventiveOrders();
  const {sectors} = useSectors(); const {machines} = useMachines(undefined,false);
  const [date,setDate] = useState(startOfMonth(new Date()));
  const [view,setView] = useState("month");
  const [sectorIds,setSectorIds] = useState<string[]>([]);
  const [area,setArea] = useState("all"); const [search,setSearch] = useState("");
  const [selectedOrderId,setSelectedOrderId] = useState<string|null>(null);
  const [selectedPlan,setSelectedPlan] = useState<PreventivePlan|null>(null);
  const [showPaused,setShowPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const today = dateKey(now);
  const start = view==="year"?`${date.getFullYear()}-01-01`:dateKey(startOfWeek(startOfMonth(date),{weekStartsOn:0}));
  const end = view==="year"?`${date.getFullYear()}-12-31`:dateKey(endOfWeek(endOfMonth(date),{weekStartsOn:0}));
  const filteredPlans = plans.filter(p=> (!sectorIds.length || (p.sector_id && sectorIds.includes(p.sector_id))) && (area==="all" || p.maintenance_type===area) && `${p.title} ${p.machine_number??""} ${p.description}`.toLowerCase().includes(search.toLowerCase()));
  const events = useMemo(()=>{
    const result:CalendarEvent[]=[];
    const matches = (o:PreventiveOrder)=>o.order_type==="preventive" && (!sectorIds.length || (o.sector_id && sectorIds.includes(o.sector_id))) && (area==="all" || o.maintenance_type===area) && `${o.title} ${o.machine_number??""} ${o.description}`.toLowerCase().includes(search.toLowerCase());
    for (const order of orders.filter(matches)) {
      const scheduled=order.scheduled_date;
      if (!scheduled || scheduled<start || scheduled>end) continue;
      const delay = getPreventiveOrderDelayInfo(order, now);
      const status =
        order.status === "completed"
          ? "Concluída"
          : order.status === "canceled"
            ? "Cancelada"
            : order.status === "waiting_parts"
              ? "Aguardando peças"
              : order.status === "in_progress"
                ? "Em andamento"
                : delay.isDateOverdue
                  ? "Data vencida"
                  : isInReleaseWindow(scheduled, today)
                    ? "Programada"
                    : "Projetada";
      result.push({
        date: scheduled,
        title: order.title,
        order,
        status,
        machine: order.machine_number ?? "Geral do setor",
        isDateOverdue: delay.isDateOverdue,
        daysOverdue: delay.daysOverdue,
        isPartsOverdue: delay.isPartsOverdue,
        partsDaysOverdue: delay.partsDaysOverdue,
        partsExpectedDate: order.parts_expected_date,
        isTimeExceeded: delay.isTimeExceeded,
        overtimeMinutes: delay.overtimeMinutes,
      });
    }
    for (const plan of filteredPlans.filter(p=>p.active)) {
      for (const scheduled of projectPreventiveDates(plan.next_due_date,plan.periodicity as Periodicity,start,end)) {
        if (result.some(e=>e.order?.plan_id===plan.id && e.date===scheduled)) continue;
        const isDateOverdue = scheduled < today;
        const daysOverdue = isDateOverdue ? Math.max(1, differenceInCalendarDays(parseISO(today), parseISO(scheduled))) : 0;
        result.push({
          date: scheduled,
          title: plan.title,
          plan,
          status: isDateOverdue ? "Data vencida" : "Projetada",
          machine: plan.machine_number ?? "Geral do setor",
          isDateOverdue,
          daysOverdue,
          isPartsOverdue: false,
          partsDaysOverdue: 0,
          isTimeExceeded: false,
          overtimeMinutes: 0,
        });
      }
    }
    return result.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
  },[orders,plans,sectorIds,area,search,start,end,today,now]);
  const overdueDateCount = useMemo(() => events.filter((e) => e.isDateOverdue).length, [events]);
  const exceededTimeCount = useMemo(() => events.filter((e) => e.isTimeExceeded).length, [events]);
  const waitingPartsCount = useMemo(() => events.filter((e) => e.order?.status === "waiting_parts").length, [events]);
  const refresh=()=>{refetchPlans();refetchOrders();};
  function openEvent(event:CalendarEvent) {
    if(event.order) setSelectedOrderId(event.order.id);
    else if(event.plan) {
      const activeOrder=orders.find(o=>o.plan_id===event.plan?.id && ["pending_planning","waiting_parts","planned","in_progress"].includes(o.status));
      if(activeOrder)setSelectedOrderId(activeOrder.id);else setSelectedPlan(event.plan);
    }
  }
  const renderEvent = (event: CalendarEvent, compact = false) => {
    const cardTone = event.isDateOverdue || event.isPartsOverdue
      ? "border-destructive bg-destructive/15 text-foreground hover:bg-destructive/20"
      : event.isTimeExceeded
        ? "border-status-open bg-status-open/15 text-foreground hover:bg-status-open/20"
        : statusStyle[event.status];
    const tooltip = [
      event.title,
      event.machine,
      event.status,
      event.partsExpectedDate ? `Peças previstas: ${format(parseISO(event.partsExpectedDate), "dd/MM/yyyy")}` : "",
      event.isDateOverdue ? `Data vencida há ${event.daysOverdue}d` : "",
      event.isPartsOverdue ? `Peças atrasadas há ${event.partsDaysOverdue}d` : "",
      event.isTimeExceeded ? `Tempo excedido (+${formatEstimatedMinutes(event.overtimeMinutes)})` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <Button
        key={`${event.order?.id ?? event.plan?.id}-${event.date}`}
        variant="ghost"
        onClick={() => openEvent(event)}
        title={tooltip}
        className={cn(
          "h-auto w-full min-w-0 items-start justify-start border-l-2 rounded-sm px-2 py-1.5 text-left whitespace-normal",
          cardTone
        )}
      >
        <span className="min-w-0 w-full space-y-1">
          <span className={cn("block font-semibold break-words", compact ? "text-[11px] line-clamp-2" : "text-sm")}>
            {event.title}
          </span>
          <span className="block text-[10px] opacity-90">
            {event.machine} · {event.status}
          </span>
          {(event.isDateOverdue || event.isTimeExceeded || event.partsExpectedDate) && (
            <span className="flex flex-wrap gap-1 pt-0.5">
              {event.partsExpectedDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border",
                    event.isPartsOverdue
                      ? "bg-destructive/20 text-destructive border-destructive/50"
                      : "bg-status-open/20 text-status-open border-status-open/50"
                  )}
                >
                  <ShoppingCart className="h-2.5 w-2.5 shrink-0" />
                  {event.isPartsOverdue
                    ? compact
                      ? `Peças -${event.partsDaysOverdue}d`
                      : `Peças atrasadas (${event.partsDaysOverdue}d)`
                    : `Peças ${format(parseISO(event.partsExpectedDate), "dd/MM")}`}
                </span>
              )}
              {event.isDateOverdue && (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-destructive/20 text-destructive border border-destructive/50">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                  {compact ? `Data -${event.daysOverdue}d` : `Data vencida (${event.daysOverdue}d)`}
                </span>
              )}
              {event.isTimeExceeded && (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-status-open/20 text-status-open border border-status-open/50">
                  <TimerOff className="h-2.5 w-2.5 shrink-0" />
                  {compact
                    ? `+${formatEstimatedMinutes(event.overtimeMinutes)}`
                    : `Tempo excedido (+${formatEstimatedMinutes(event.overtimeMinutes)})`}
                </span>
              )}
            </span>
          )}
        </span>
      </Button>
    );
  };
  if(loading||loadingOrders) return <div className="flex justify-center p-16"><Loader2 className="animate-spin text-primary"/></div>;
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="text-primary h-6 w-6"/>Calendário de Preventivas</h1><Button asChild variant="outline"><Link to="/dashboard/preventive"><ClipboardList className="mr-2 h-4 w-4"/>Ordens</Link></Button></header>
    <div className="flex flex-wrap gap-3 border-y border-border py-3">
      <SectorMultiSelect sectors={sectors} selected={sectorIds} onChange={setSectorIds}/>
      <Select value={area} onValueChange={setArea}><SelectTrigger className="w-48" aria-label="Tipo de manutenção"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas as áreas</SelectItem>{Object.entries(PREVENTIVE_MAINTENANCE_LABELS).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input aria-label="Buscar preventiva" placeholder="Atividade ou equipamento" value={search} onChange={e=>setSearch(e.target.value)} className="pl-9"/></div>
    </div>
    <div className="flex flex-wrap gap-3 items-center justify-between"><div className="flex items-center gap-2"><Button size="icon" variant="outline" aria-label="Período anterior" onClick={()=>setDate(addMonths(date,view==="year"?-12:-1))}><ChevronLeft className="h-4 w-4"/></Button><h2 className="min-w-40 text-center font-semibold capitalize">{view==="year"?format(date,"yyyy"):format(date,"MMMM yyyy",{locale:ptBR})}</h2><Button size="icon" variant="outline" aria-label="Próximo período" onClick={()=>setDate(addMonths(date,view==="year"?12:1))}><ChevronRight className="h-4 w-4"/></Button><Button variant="ghost" onClick={()=>setDate(startOfMonth(new Date()))}>Hoje</Button></div><Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="month">Mês</TabsTrigger><TabsTrigger value="year">Ano</TabsTrigger></TabsList></Tabs></div>
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs items-center">
      {Object.entries(statusStyle)
        .filter(([s]) => s !== "Cancelada")
        .map(([s, c]) => {
          const badgeCount =
            s === "Data vencida"
              ? overdueDateCount
              : s === "Tempo excedido"
                ? exceededTimeCount
                : s === "Aguardando peças"
                  ? waitingPartsCount
                  : 0;
          return (
            <span key={s} className={cn("border-l-2 px-2 py-0.5 rounded-r-sm font-medium", c)}>
              {s}
              {badgeCount > 0 && <strong className="ml-1">({badgeCount})</strong>}
            </span>
          );
        })}
    </div>
    {view==="month"?<>
      <div className="hidden md:block border border-border rounded-md overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d=><div key={d} className="text-xs text-center py-2 font-semibold">{d}</div>)}</div>
        <div className="grid grid-cols-7">{eachDayOfInterval({start:parseISO(start),end:parseISO(end)}).map(day=>{const key=dateKey(day);return <div key={key} className={cn("min-h-32 min-w-0 border-t border-r border-border p-1.5",day.getMonth()!==date.getMonth()&&"bg-muted/30",key===today&&"bg-primary/5")}><p className={cn("text-xs mb-2 px-1 font-semibold",key===today?"text-primary":"text-muted-foreground")}>{format(day,"d")}</p><div className="space-y-1">{events.filter(e=>e.date===key).map(e=>renderEvent(e,true))}</div></div>;})}</div>
      </div>
      <div className="md:hidden space-y-4">{Array.from(new Set(events.filter(e=>e.date.slice(0,7)===dateKey(date).slice(0,7)).map(e=>e.date))).map(day=><section key={day} className="border-t border-border pt-3"><h3 className="text-sm font-semibold mb-2">{format(parseISO(day),"EEEE, dd MMM",{locale:ptBR})}</h3>{events.filter(e=>e.date===day).map(e=>renderEvent(e))}</section>)}</div>
    </>:<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{Array.from({length:12},(_,m)=>{const month=`${date.getFullYear()}-${String(m+1).padStart(2,"0")}`;const list=events.filter(e=>e.date.startsWith(month));return <section key={month} className="border-t border-border pt-3 min-w-0"><h3 className="font-semibold capitalize mb-3">{format(parseISO(`${month}-01`),"MMMM",{locale:ptBR})}<span className="ml-2 text-xs text-muted-foreground">{list.length}</span></h3><div className="space-y-2">{list.map(e=><div key={`${e.date}-${e.order?.id??e.plan?.id}`} className="flex items-start gap-2"><span className="text-xs font-mono pt-2 text-muted-foreground">{e.date.slice(-2)}</span>{renderEvent(e)}</div>)}{!list.length&&<p className="text-xs text-muted-foreground">Sem preventivas</p>}</div></section>;})}</div>}
    {!events.length&&<p className="py-8 text-center text-muted-foreground">Nenhuma preventiva neste período.</p>}
    <div className="border-t border-border pt-4"><Button variant="ghost" onClick={()=>setShowPaused(!showPaused)}>Planos pausados / encerrados ({filteredPlans.filter(p=>!p.active).length})</Button>{showPaused&&<div className="space-y-2 mt-3">{filteredPlans.filter(p=>!p.active).map(p=><Button key={p.id} variant="outline" onClick={()=>setSelectedPlan(p)} className="w-full justify-start whitespace-normal h-auto py-3">{p.title} · {p.machine_number??"Geral"} · {PERIODICITIES[p.periodicity as Periodicity].label}</Button>)}</div>}</div>
    <PreventiveOrderDetailSheet order={orders.find(o=>o.id===selectedOrderId)??null} open={!!selectedOrderId} onOpenChange={open=>{if(!open)setSelectedOrderId(null);}} sectors={sectors} machines={machines} onUpdate={refresh}/>
    {selectedPlan&&<PreventivePlanEditor key={selectedPlan.id} plan={selectedPlan} onClose={()=>setSelectedPlan(null)} onSaved={refresh}/>}
  </div>;
}
export default function PreventiveCalendarPage(){return <DashboardLayout requiredRoles={["manutencao","gestor"]}><CalendarContent/></DashboardLayout>;}