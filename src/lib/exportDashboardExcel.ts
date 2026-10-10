import * as XLSX from "xlsx";
import { format } from "date-fns";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { operatingMinutes } from "@/lib/operatingTime";

const fmtMin = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);
const dt = (s?: string | null) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm") : "");
const STATUS: Record<string, string> = { open: "Aberta", in_progress: "Em Andamento", closed: "Fechada" };

interface Params {
  orders: ServiceOrder[];
  workLogs: WorkLog[];
  techWorkLogs: WorkLog[];
  techOrders: ServiceOrder[];
  machines: Machine[];
  sectorNames: Map<string, string>;
  shiftsByMachine: Map<string, number>;
  start: Date;
  end: Date;
  sectorLabel: string;
}

export function exportDashboardExcel({ orders, workLogs, techWorkLogs, techOrders, machines, sectorNames, shiftsByMachine, start, end, sectorLabel }: Params) {
  const shiftsOf = (o: ServiceOrder) => (o.machine_id && shiftsByMachine.get(o.machine_id)) || 3;
  const om = (a: string, b: string, o: ServiceOrder) => operatingMinutes(a, b, shiftsOf(o));
  const machineById = new Map(machines.map((m) => [m.id, m]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  const qualified = orders.filter((o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at);

  const mttr = qualified.length ? qualified.reduce((a, o) => a + om(o.started_at!, o.finished_at!, o), 0) / qualified.length : 0;
  const mtta = qualified.length ? qualified.reduce((a, o) => a + om(o.created_at, o.started_at!, o), 0) / qualified.length : 0;
  const downtime = qualified.reduce((a, o) => a + om(o.created_at, o.finished_at!, o), 0);
  const sorted = [...qualified].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let gap = 0;
  for (let i = 1; i < sorted.length; i++) gap += om(sorted[i - 1].finished_at!, sorted[i].created_at, sorted[i]);
  const mtbf = sorted.length > 1 ? gap / (sorted.length - 1) : 0;
  const availability = sorted.length > 1 && mtbf + mttr > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;
  const manMin = workLogs.reduce((a, l) => a + (l.duration_minutes || 0), 0);

  const summary = [
    ["Relatório de Manutenção - Dashboard"],
    ["Período", `${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")}`],
    ["Setor", sectorLabel],
    ["Gerado em", format(new Date(), "dd/MM/yyyy HH:mm")],
    [],
    ["Indicador", "Valor"],
    ["Disponibilidade (%)", Math.round(availability * 10) / 10],
    ["MTBF", sorted.length > 1 ? fmtMin(mtbf) : "—"],
    ["MTTR", fmtMin(mttr)],
    ["MTTA", fmtMin(mtta)],
    ["Downtime", fmtMin(downtime)],
    ["Homem-Hora (h)", Math.round((manMin / 60) * 10) / 10],
    ["Total de Ordens", orders.length],
    ["Abertas", orders.filter((o) => o.status === "open").length],
    ["Em Andamento", orders.filter((o) => o.status === "in_progress").length],
    ["Fechadas", orders.filter((o) => o.status === "closed").length],
  ];

  const machineInfo = (id: string | null) => {
    const m = id ? machineById.get(id) : undefined;
    return { code: m?.code ?? "", model: m?.model ?? "", sector: m?.sector_id ? sectorNames.get(m.sector_id) ?? "" : "" };
  };

  const orderRows = orders.map((o) => {
    const m = machineInfo(o.machine_id);
    return {
      "OS": o.id.slice(0, 8),
      "Nota SAP": o.sap_notification_number ?? "",
      "Máquina": m.code,
      "Modelo": m.model,
      "Setor": m.sector,
      "Tipo de Corretiva": o.is_machine_stopped ? "Corretiva Emergencial" : "Corretiva Programada",
      "Categoria": o.maintenance_type === "electronic" ? "Elétrico" : o.maintenance_type === "mechanical" ? "Mecânico" : "",
      "Status": STATUS[o.status] ?? o.status,
      "Solicitante": o.opener_name ?? "",
      "Problema": o.problem_description,
      "Solução": o.solution_description ?? "",
      "Abertura": dt(o.created_at),
      "Início": dt(o.started_at),
      "Término": dt(o.finished_at),
      "Tempo de Parada": o.is_machine_stopped && o.finished_at ? fmtMin(om(o.created_at, o.finished_at, o)) : "",
    };
  });

  const logRows = workLogs.map((l) => {
    const o = orderById.get(l.order_id);
    return {
      "Técnico": l.technician_name,
      "Matrícula": l.technician_registry ?? "",
      "OS": l.order_id.slice(0, 8),
      "Máquina": machineInfo(o?.machine_id ?? null).code,
      "Centro de Trabalho": l.work_center,
      "Início": dt(l.started_at),
      "Término": dt(l.ended_at),
      "Duração (min)": l.duration_minutes ?? "",
      "Relato": l.notes ?? "",
    };
  });

  const criticalRows = qualified
    .map((o) => ({ o, mins: om(o.created_at, o.finished_at!, o) }))
    .filter((x) => x.mins > 180)
    .sort((a, b) => b.mins - a.mins)
    .map(({ o, mins }) => {
      const m = machineInfo(o.machine_id);
      return { "OS": o.id.slice(0, 8), "Máquina": m.code, "Modelo": m.model, "Setor": m.sector, "Abertura": dt(o.created_at), "Término": dt(o.finished_at), "Tempo de Parada": fmtMin(mins), "Problema": o.problem_description };
    });

  const techs = new Map<string, { sessions: number; total: number; resp: number; rep: number; n: number }>();
  const perOrder = new Map<string, { first: string; rep: number; o: ServiceOrder }>();
  const qMap = new Map(techOrders.filter((o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at).map((o) => [o.id, o]));
  techWorkLogs.forEach((l) => {
    if (l.duration_minutes === null) return;
    const t = techs.get(l.technician_name) ?? { sessions: 0, total: 0, resp: 0, rep: 0, n: 0 };
    t.sessions++; t.total += l.duration_minutes || 0;
    techs.set(l.technician_name, t);
    const o = qMap.get(l.order_id);
    if (!o || !l.ended_at) return;
    const k = `${l.technician_name}|${o.id}`;
    const e = perOrder.get(k);
    const rep = om(l.started_at, l.ended_at, o);
    if (e) { e.rep += rep; if (l.started_at < e.first) e.first = l.started_at; }
    else perOrder.set(k, { first: l.started_at, rep, o });
  });
  perOrder.forEach((e, k) => {
    const t = techs.get(k.split("|")[0])!;
    t.resp += om(e.o.created_at, e.first, e.o); t.rep += e.rep; t.n++;
  });
  const techRows = [...techs.entries()].map(([name, t]) => ({
    "Técnico": name,
    "Sessões": t.sessions,
    "Tempo Total": fmtMin(t.total),
    "Tempo Médio para Atendimento (MTTA)": t.n ? fmtMin(t.resp / t.n) : "—",
    "Tempo Médio de Reparo (MTTR)": t.n ? fmtMin(t.rep / t.n) : "—",
  }));

  const wb = XLSX.utils.book_new();
  const add = (name: string, ws: XLSX.WorkSheet) => {
    const ref = ws["!ref"];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      ws["!cols"] = Array.from({ length: range.e.c + 1 }, () => ({ wch: 22 }));
    }
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add("Resumo KPIs", XLSX.utils.aoa_to_sheet(summary));
  add("Ordens de Serviço", XLSX.utils.json_to_sheet(orderRows));
  add("Apontamentos", XLSX.utils.json_to_sheet(logRows));
  add("Paradas acima de 3h", XLSX.utils.json_to_sheet(criticalRows));
  add("Desempenho Técnicos", XLSX.utils.json_to_sheet(techRows));
  XLSX.writeFile(wb, `Relatorio_Manutencao_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`);
}
