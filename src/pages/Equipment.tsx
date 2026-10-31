import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardFilters, loadSavedFilter, type DateFilter } from "@/components/manager/DashboardFilters";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { computeMachineMetrics, fmtMin, type MachineMetrics } from "@/lib/machineMetrics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cog, Search, Loader2, Sparkles, FileText, Activity, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Sector = { id: string; name: string; shifts_count: number };
type Row = { machine: Machine & { status?: string }; metrics: MachineMetrics; orders: ServiceOrder[] };

const riskLabel = { baixo: "Baixo", medio: "Médio", critico: "Crítico" } as const;
const riskClass = {
  baixo: "bg-status-closed/15 text-status-closed border-status-closed/30",
  medio: "bg-status-open/15 text-status-open border-status-open/30",
  critico: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function EquipmentPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [machines, setMachines] = useState<(Machine & { status?: string })[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>(loadSavedFilter);
  const [sectorId, setSectorId] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("critical");
  const [selected, setSelected] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [o, l, m, s] = await Promise.all([
        supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("work_logs").select("*"),
        supabase.from("machines").select("*").order("code"),
        supabase.from("sectors").select("id, name, shifts_count").order("name"),
      ]);
      setOrders((o.data as ServiceOrder[]) || []);
      setLogs((l.data as WorkLog[]) || []);
      setMachines((m.data as Machine[]) || []);
      setSectors((s.data as Sector[]) || []);
      setLoading(false);
    })();
  }, []);

  const sectorName = (id: string | null) => sectors.find((s) => s.id === id)?.name || "Sem setor";

  const rows: Row[] = useMemo(() => {
    const inPeriod = orders.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= filter.start.getTime() && t <= filter.end.getTime();
    });
    return machines
      .filter((m) => m.status !== "inactive")
      .filter((m) => sectorId === "all" || m.sector_id === sectorId)
      .map((m) => {
        const mo = inPeriod.filter((o) => o.machine_id === m.id);
        // open orders always count for live status, even if created before the period
        const live = orders.filter((o) => o.machine_id === m.id && o.status !== "closed");
        const all = [...mo, ...live.filter((x) => !mo.includes(x))];
        const shifts = sectors.find((s) => s.id === m.sector_id)?.shifts_count || 3;
        return { machine: m, orders: mo, metrics: { ...computeMachineMetrics(mo, logs, shifts), openNow: computeMachineMetrics(all, [], shifts).openNow } };
      });
  }, [orders, logs, machines, sectors, sectorId, filter]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter(
      (r) => !q || [r.machine.code, r.machine.model, r.machine.manufacturer].some((v) => v?.toLowerCase().includes(q)),
    );
    return list.sort((a, b) => {
      if (sort === "alpha") return a.machine.code.localeCompare(b.machine.code, "pt-BR", { numeric: true });
      if (sort === "stopped") return Number(!!b.metrics.openNow?.is_machine_stopped) - Number(!!a.metrics.openNow?.is_machine_stopped);
      if (sort === "downtime") return b.metrics.downtime - a.metrics.downtime;
      return a.metrics.healthScore - b.metrics.healthScore;
    });
  }, [rows, search, sort]);

  const summary = {
    total: rows.length,
    ok: rows.filter((r) => !r.metrics.openNow).length,
    open: rows.filter((r) => r.metrics.openNow).length,
    bad: rows.filter((r) => r.metrics.risk === "critico").length,
  };

  const sel = rows.find((r) => r.machine.id === selected) || null;
  const periodLabel = `${format(filter.start, "dd/MM/yyyy")} a ${format(filter.end, "dd/MM/yyyy")}`;
  const aiKey = sel ? `${sel.machine.id}|${filter.start.getTime()}|${filter.end.getTime()}` : "";

  async function runAI() {
    if (!sel) return;
    setAiLoading(true);
    const m = sel.metrics;
    const { data, error } = await supabase.functions.invoke("machine-analysis", {
      body: {
        machineName: `${sel.machine.code}${sel.machine.model ? " – " + sel.machine.model : ""}`,
        sectorName: sectorName(sel.machine.sector_id),
        period: periodLabel,
        kpis: {
          "Paradas (corretiva emergencial)": m.stops,
          MTTR: fmtMin(m.mttr),
          MTBF: m.mtbf === null ? "—" : fmtMin(m.mtbf),
          Disponibilidade: `${m.availability}%`,
          "Tempo parado": fmtMin(m.downtime),
          "Horas-homem": m.manHours,
          "Ordens totais": m.totalOrders,
        },
        orders: sel.orders.slice(0, 150).map((o) => ({
          date: format(new Date(o.created_at), "dd/MM/yyyy HH:mm"),
          type: o.maintenance_type === "electronic" ? "Elétrica" : "Mecânica",
          stopped: o.is_machine_stopped,
          problem: (o.problem_description || "").slice(0, 1000),
          solution: (o.solution_description || "").slice(0, 1000),
          durationMin: o.started_at && o.finished_at ? Math.round((new Date(o.finished_at).getTime() - new Date(o.started_at).getTime()) / 60000) : undefined,
        })),
      },
    });
    setAiLoading(false);
    const msg = (data as any)?.error || (error ? "Não foi possível gerar a análise." : null);
    if (msg) return toast.error(msg);
    setAnalysis((a) => ({ ...a, [aiKey]: (data as any).analysis }));
  }

  function exportPdf() {
    if (!sel) return;
    const m = sel.metrics;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Prontuário do Equipamento – ${sel.machine.code}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`${sel.machine.model || ""} ${sel.machine.manufacturer || ""} | Setor: ${sectorName(sel.machine.sector_id)} | Período: ${periodLabel}`, 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [["Indicador", "Valor"]],
      body: [
        ["Saúde", `${m.healthScore}% (risco ${riskLabel[m.risk]})`],
        ["Paradas", String(m.stops)],
        ["MTBF", m.mtbf === null ? "—" : fmtMin(m.mtbf)],
        ["MTTR", fmtMin(m.mttr)],
        ["Disponibilidade", `${m.availability}%`],
        ["Tempo parado", fmtMin(m.downtime)],
        ["Horas-homem", String(m.manHours)],
        ["Mecânica / Elétrica", `${m.mechanical} / ${m.electronic}`],
      ],
    });
    const text = analysis[aiKey];
    let y = (doc as any).lastAutoTable.finalY + 8;
    if (text) {
      doc.setFontSize(12);
      doc.text("Análise da IA", 14, y);
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(text.replace(/[#*]/g, ""), 180);
      y += 6;
      for (const ln of lines) {
        if (y > 285) { doc.addPage(); y = 15; }
        doc.text(ln, 14, y);
        y += 4.5;
      }
      y += 4;
    }
    autoTable(doc, {
      startY: y > 270 ? 15 : y,
      head: [["Data", "Tipo", "Parada", "Problema", "Solução", "Técnico"]],
      body: sel.orders.map((o) => [
        format(new Date(o.created_at), "dd/MM/yy HH:mm"),
        o.maintenance_type === "electronic" ? "Elétrica" : "Mecânica",
        o.is_machine_stopped ? "Sim" : "Não",
        o.problem_description,
        o.solution_description || "",
        o.technician_name || "",
      ]),
      styles: { fontSize: 7 },
    });
    doc.save(`Prontuario_${sel.machine.code}.pdf`);
  }

  return (
    <DashboardLayout requiredRoles={["gestor", "manutencao"]}>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground mt-1">Saúde, confiabilidade e histórico de cada ativo</p>
        </div>

        <DashboardFilters filter={filter} onChange={setFilter} sectorId={sectorId} onSectorChange={setSectorId} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Cog} label="Equipamentos" value={summary.total} />
          <SummaryCard icon={CheckCircle2} label="Operando" value={summary.ok} tone="text-status-closed" />
          <SummaryCard icon={Wrench} label="Com ordem aberta" value={summary.open} tone="text-status-open" />
          <SummaryCard icon={AlertTriangle} label="Críticos (Bad Actors)" value={summary.bad} tone="text-destructive" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por código, modelo ou fabricante" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Mais críticos primeiro</SelectItem>
              <SelectItem value="downtime">Maior tempo parado</SelectItem>
              <SelectItem value="stopped">Parados agora</SelectItem>
              <SelectItem value="alpha">Ordem alfabética</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Nenhum equipamento encontrado.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((r) => {
              const live = r.metrics.openNow;
              const status = !live ? "Operando" : live.is_machine_stopped ? "Parada" : "Em atendimento";
              const dot = !live ? "bg-status-closed" : live.is_machine_stopped ? "bg-destructive animate-pulse" : "bg-status-open";
              return (
                <button
                  key={r.machine.id}
                  onClick={() => setSelected(r.machine.id)}
                  className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-lg truncate">{r.machine.code}</p>
                      <p className="text-sm text-muted-foreground truncate">{r.machine.model || "—"}{r.machine.manufacturer ? ` · ${r.machine.manufacturer}` : ""}</p>
                    </div>
                    <Badge variant="outline" className={riskClass[r.metrics.risk]}>{riskLabel[r.metrics.risk]}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm">
                    <span className={cn("w-2.5 h-2.5 rounded-full", dot)} />
                    <span>{status}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{sectorName(r.machine.sector_id)}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Saúde</span><span className="font-semibold text-foreground">{r.metrics.healthScore}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn("h-full", r.metrics.risk === "critico" ? "bg-destructive" : r.metrics.risk === "medio" ? "bg-status-open" : "bg-status-closed")} style={{ width: `${r.metrics.healthScore}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div><p className="text-muted-foreground">Paradas</p><p className="font-semibold">{r.metrics.stops}</p></div>
                    <div><p className="text-muted-foreground">MTTR</p><p className="font-semibold">{fmtMin(r.metrics.mttr)}</p></div>
                    <div><p className="text-muted-foreground">Parado</p><p className="font-semibold">{fmtMin(r.metrics.downtime)}</p></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!sel} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {sel && (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-2xl">{sel.machine.code}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {sel.machine.model || "—"} {sel.machine.manufacturer ? `· ${sel.machine.manufacturer}` : ""} · {sectorName(sel.machine.sector_id)} · {periodLabel}
                </p>
              </SheetHeader>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={riskClass[sel.metrics.risk]}>Risco {riskLabel[sel.metrics.risk]}</Badge>
                <Badge variant="outline">Saúde {sel.metrics.healthScore}%</Badge>
                <Button size="sm" variant="outline" className="ml-auto" onClick={exportPdf}><FileText className="w-4 h-4 mr-1" />Prontuário PDF</Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Kpi label="MTBF" value={sel.metrics.mtbf === null ? "—" : fmtMin(sel.metrics.mtbf)} />
                <Kpi label="MTTR" value={fmtMin(sel.metrics.mttr)} />
                <Kpi label="Disponibilidade" value={`${sel.metrics.availability}%`} />
                <Kpi label="Tempo parado" value={fmtMin(sel.metrics.downtime)} />
                <Kpi label="Paradas (emergencial)" value={String(sel.metrics.stops)} />
                <Kpi label="Horas-homem" value={`${sel.metrics.manHours} h`} />
              </div>

              {sel.metrics.mechanical + sel.metrics.electronic > 0 && (
                <div className="rounded-xl border border-border p-4">
                  <p className="font-semibold mb-2">Mecânica x Elétrica (ordens encerradas)</p>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={[{ name: "Mecânica", v: sel.metrics.mechanical }, { name: "Elétrica", v: sel.metrics.electronic }]} dataKey="v" nameKey="name" innerRadius={45} outerRadius={70}>
                          <Cell fill="hsl(var(--primary))" />
                          <Cell fill="hsl(var(--status-open))" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <p className="font-semibold">Análise da IA</p>
                  <Button size="sm" className="ml-auto" disabled={aiLoading || sel.orders.length === 0} onClick={runAI}>
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Activity className="w-4 h-4 mr-1" />}
                    {analysis[aiKey] ? "Gerar novamente" : "Gerar análise"}
                  </Button>
                </div>
                {sel.orders.length === 0 && <p className="text-sm text-muted-foreground">Sem ordens no período para analisar.</p>}
                {analysis[aiKey] && (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{analysis[aiKey]}</ReactMarkdown>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold mb-2">Histórico de ordens ({sel.orders.length})</p>
                <div className="rounded-xl border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Problema</TableHead>
                        <TableHead>Solução</TableHead>
                        <TableHead>Técnico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sel.orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="whitespace-nowrap text-xs">{format(new Date(o.created_at), "dd/MM/yy HH:mm")}</TableCell>
                          <TableCell className="text-xs">
                            {o.maintenance_type === "electronic" ? "Elétrica" : "Mecânica"}
                            {o.is_machine_stopped && <Badge variant="outline" className="ml-1 text-[10px] border-destructive/40 text-destructive">Parada</Badge>}
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px]">{o.problem_description}</TableCell>
                          <TableCell className="text-xs max-w-[220px] text-muted-foreground">{o.solution_description || "—"}</TableCell>
                          <TableCell className="text-xs">{o.technician_name || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="w-4 h-4" />{label}</div>
      <p className={cn("text-3xl font-bold mt-1", tone)}>{value}</p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
