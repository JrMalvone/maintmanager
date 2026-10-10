import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, eachDayOfInterval, startOfDay } from "date-fns";
import type { ServiceOrder, Machine } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";
import { operatingMinutes } from "@/lib/operatingTime";

type RGB = [number, number, number];
const DARK: RGB = [30, 41, 59];
const BLUE: RGB = [59, 130, 246];
const ORANGE: RGB = [249, 115, 22];
const RED: RGB = [220, 38, 38];
const GREEN: RGB = [22, 163, 74];
const GREY: RGB = [100, 116, 139];

const fmtMin = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);
const dt = (s?: string | null) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm") : "—");

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

function barChart(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, data: { label: string; value: number; display?: string }[], color: RGB) {
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text(title, x + 4, y + 7);
  if (!data.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GREY);
    doc.text("Sem dados no período", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const labelW = 38, top = y + 12, rowH = Math.min(9, (h - 16) / data.length);
  const barMax = w - labelW - 26;
  data.forEach((d, i) => {
    const ry = top + i * rowH;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(d.label, labelW - 2)[0], x + 4, ry + rowH / 2 + 1);
    const bw = Math.max((d.value / max) * barMax, 0.5);
    doc.setFillColor(...color);
    doc.rect(x + labelW, ry + 1.2, bw, rowH - 2.4, "F");
    doc.text(d.display ?? String(d.value), x + labelW + bw + 2, ry + rowH / 2 + 1);
  });
}

function columnChart(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, labels: string[], series: { name: string; values: number[]; color: RGB }[]) {
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text(title, x + 4, y + 7);
  // legend
  let lx = x + w - 4;
  [...series].reverse().forEach((s) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const tw = doc.getTextWidth(s.name);
    lx -= tw; doc.text(s.name, lx, y + 7);
    lx -= 4; doc.setFillColor(...s.color); doc.rect(lx, y + 4.5, 3, 3, "F"); lx -= 4;
  });
  const cx = x + 10, cy = y + 12, cw = w - 14, ch = h - 22;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  doc.setDrawColor(203, 213, 225);
  doc.line(cx, cy + ch, cx + cw, cy + ch);
  doc.setFontSize(7); doc.setTextColor(...GREY);
  doc.text(String(max), cx - 1, cy + 2, { align: "right" });
  doc.text("0", cx - 1, cy + ch, { align: "right" });
  const n = labels.length || 1;
  const slot = cw / n, bw = Math.max((slot * 0.75) / series.length, 0.4);
  const step = Math.ceil(n / 12);
  labels.forEach((l, i) => {
    series.forEach((s, k) => {
      const v = s.values[i] || 0;
      const bh = (v / max) * ch;
      doc.setFillColor(...s.color);
      doc.rect(cx + i * slot + slot * 0.125 + k * bw, cy + ch - bh, bw, bh, "F");
    });
    if (i % step === 0) { doc.setTextColor(...GREY); doc.text(l, cx + i * slot + slot / 2, cy + ch + 4, { align: "center" }); }
  });
}

function donut(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, parts: { label: string; value: number; color: RGB }[]) {
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text(title, x + 4, y + 7);
  const total = parts.reduce((a, p) => a + p.value, 0);
  const cx = x + w * 0.32, cy = y + h / 2 + 3, r = Math.min(w * 0.25, h / 2 - 9);
  if (!total) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GREY);
    doc.text("Sem dados no período", x + w / 2, y + h / 2, { align: "center" });
    return;
  }
  let a0 = -Math.PI / 2;
  parts.forEach((p) => {
    if (!p.value) return;
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 60));
    doc.setFillColor(...p.color);
    for (let i = 0; i < steps; i++) {
      const s = a0 + ((a1 - a0) * i) / steps, e = a0 + ((a1 - a0) * (i + 1)) / steps + 0.01;
      doc.triangle(cx, cy, cx + r * Math.cos(s), cy + r * Math.sin(s), cx + r * Math.cos(e), cy + r * Math.sin(e), "F");
    }
    a0 = a1;
  });
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, r * 0.55, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text(String(total), cx, cy + 1.5, { align: "center" });
  parts.forEach((p, i) => {
    const ly = y + h / 2 - 4 + i * 8;
    doc.setFillColor(...p.color); doc.rect(x + w * 0.62, ly - 3, 3.5, 3.5, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...DARK);
    doc.text(`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`, x + w * 0.62 + 5, ly);
  });
}

export function exportDashboardPdf({ orders, workLogs, techWorkLogs, techOrders, machines, sectorNames, shiftsByMachine, start, end, sectorLabel }: Params) {
  const shiftsOf = (o: ServiceOrder) => (o.machine_id && shiftsByMachine.get(o.machine_id)) || 3;
  const om = (a: string, b: string, o: ServiceOrder) => operatingMinutes(a, b, shiftsOf(o));
  const machineById = new Map(machines.map((m) => [m.id, m]));
  const mLabel = (id: string | null) => {
    const m = id ? machineById.get(id) : undefined;
    return m ? [m.code, m.model].filter(Boolean).join(" - ") : "—";
  };
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

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(...DARK); doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("Relatório Gerencial de Manutenção", 14, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Período: ${format(start, "dd/MM/yyyy")} a ${format(end, "dd/MM/yyyy")}   |   Setor: ${sectorLabel}`, 14, 20);
  doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, W - 14, 20, { align: "right" });

  // KPI boxes
  const kpis: [string, string, RGB][] = [
    ["Disponibilidade", `${availability.toFixed(1).replace(".", ",")}%`, availability >= 90 ? GREEN : availability >= 75 ? ORANGE : RED],
    ["MTBF", sorted.length > 1 ? fmtMin(mtbf) : "—", BLUE],
    ["MTTR", fmtMin(mttr), BLUE],
    ["MTTA", fmtMin(mtta), BLUE],
    ["Downtime", fmtMin(downtime), RED],
    ["Homem-Hora", `${(manMin / 60).toFixed(1).replace(".", ",")} h`, BLUE],
  ];
  const bw = (W - 28 - 5 * 3) / 6;
  kpis.forEach(([label, value, c], i) => {
    const x = 14 + i * (bw + 3), y = 32;
    doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, bw, 20, 2, 2, "FD");
    doc.setFillColor(...c); doc.rect(x, y, 1.5, 20, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GREY);
    doc.text(label, x + 4, y + 6);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...DARK);
    doc.text(value, x + 4, y + 15);
  });

  // Status summary line
  const cnt = (s: string) => orders.filter((o) => o.status === s).length;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...DARK);
  doc.text(`Total de ordens: ${orders.length}   •   Abertas: ${cnt("open")}   •   Em andamento: ${cnt("in_progress")}   •   Fechadas: ${cnt("closed")}   •   Paradas qualificadas: ${qualified.length}`, 14, 59);

  // Data for charts
  const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end > new Date() ? new Date() : end) });
  const dayKey = (d: Date | string) => format(new Date(d), "yyyy-MM-dd");
  const opened = new Map<string, number>(), closed = new Map<string, number>();
  orders.forEach((o) => {
    opened.set(dayKey(o.created_at), (opened.get(dayKey(o.created_at)) || 0) + 1);
    if (o.finished_at) closed.set(dayKey(o.finished_at), (closed.get(dayKey(o.finished_at)) || 0) + 1);
  });
  const dayLabels = days.map((d) => format(d, "dd/MM"));
  const dayKeys = days.map((d) => dayKey(d));

  const dtByMachine = new Map<string, number>();
  qualified.forEach((o) => { const k = mLabel(o.machine_id); dtByMachine.set(k, (dtByMachine.get(k) || 0) + om(o.created_at, o.finished_at!, o)); });
  const top5 = [...dtByMachine].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, v]) => ({ label, value: v, display: fmtMin(v) }));

  const failByMachine = new Map<string, number>();
  orders.forEach((o) => { const k = mLabel(o.machine_id); failByMachine.set(k, (failByMachine.get(k) || 0) + 1); });
  const pareto = [...failByMachine].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));

  const half = (W - 28 - 4) / 2;
  columnChart(doc, 14, 64, W - 28, 62, "Ordens Abertas x Fechadas por Dia", dayLabels, [
    { name: "Abertas", values: dayKeys.map((k) => opened.get(k) || 0), color: ORANGE },
    { name: "Fechadas", values: dayKeys.map((k) => closed.get(k) || 0), color: GREEN },
  ]);
  barChart(doc, 14, 130, half, 62, "Top 5 Máquinas por Downtime", top5, RED);
  donut(doc, 14 + half + 4, 130, half, 62, "Categoria do Defeito", [
    { label: "Elétrico", value: orders.filter((o) => o.maintenance_type === "electronic").length, color: BLUE },
    { label: "Mecânico", value: orders.filter((o) => o.maintenance_type === "mechanical").length, color: ORANGE },
  ]);
  barChart(doc, 14, 196, half, 80, "Pareto de Ordens por Máquina", pareto, BLUE);
  donut(doc, 14 + half + 4, 196, half, 80, "Tipo de Corretiva", [
    { label: "Emergencial", value: orders.filter((o) => o.is_machine_stopped).length, color: RED },
    { label: "Programada", value: orders.filter((o) => !o.is_machine_stopped).length, color: [234, 179, 8] },
  ]);

  // Page 2: tables
  doc.addPage();
  const critical = qualified
    .map((o) => ({ o, mins: om(o.created_at, o.finished_at!, o) }))
    .filter((x) => x.mins > 180)
    .sort((a, b) => b.mins - a.mins);
  autoTable(doc, {
    startY: 14,
    head: [[{ content: "Paradas acima de 3 horas", colSpan: 5 }], ["Máquina", "Setor", "Abertura", "Término", "Tempo de Parada"]],
    body: critical.length ? critical.map(({ o, mins }) => {
      const m = o.machine_id ? machineById.get(o.machine_id) : undefined;
      return [mLabel(o.machine_id), m?.sector_id ? sectorNames.get(m.sector_id) ?? "—" : "—", dt(o.created_at), dt(o.finished_at), fmtMin(mins)];
    }) : [[{ content: "Nenhuma parada acima de 3 horas no período", colSpan: 5, styles: { halign: "center", textColor: GREY } }]],
    theme: "grid", headStyles: { fillColor: DARK, fontSize: 9 }, styles: { fontSize: 8.5 }, margin: { left: 14, right: 14 },
  });

  const techs = new Map<string, { sessions: number; total: number; resp: number[]; rep: number[] }>();
  const qMap = new Map(techOrders.filter((o) => o.status === "closed" && o.is_machine_stopped && o.started_at && o.finished_at).map((o) => [o.id, o]));
  const firstByTechOrder = new Map<string, { first: string; rep: number; o: ServiceOrder }>();
  workLogs.forEach((l) => {
    const t = techs.get(l.technician_name) ?? { sessions: 0, total: 0, resp: [], rep: [] };
    t.sessions++; t.total += l.duration_minutes || 0; techs.set(l.technician_name, t);
    const o = qMap.get(l.order_id);
    if (!o || !l.ended_at) return;
    const k = `${l.technician_name}|${o.id}`;
    const e = firstByTechOrder.get(k);
    const rep = om(l.started_at, l.ended_at, o);
    if (!e) firstByTechOrder.set(k, { first: l.started_at, rep, o });
    else { e.rep += rep; if (l.started_at < e.first) e.first = l.started_at; }
  });
  firstByTechOrder.forEach((v, k) => {
    const t = techs.get(k.split("|")[0])!;
    t.resp.push(om(v.o.created_at, v.first, v.o)); t.rep.push(v.rep);
  });
  const avg = (a: number[]) => (a.length ? fmtMin(a.reduce((x, y) => x + y, 0) / a.length) : "—");
  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY ?? 14) + 8,
    head: [[{ content: "Desempenho dos Técnicos", colSpan: 5 }], ["Técnico", "Sessões", "Tempo Total", "Tempo Médio para Atendimento", "Tempo Médio de Reparo"]],
    body: techs.size ? [...techs].sort((a, b) => b[1].total - a[1].total).map(([n, t]) => [n, t.sessions, fmtMin(t.total), avg(t.resp), avg(t.rep)])
      : [[{ content: "Sem apontamentos no período", colSpan: 5, styles: { halign: "center", textColor: GREY } }]],
    theme: "grid", headStyles: { fillColor: DARK, fontSize: 9 }, styles: { fontSize: 8.5 }, margin: { left: 14, right: 14 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GREY);
    doc.text(`CMMS Industrial — Relatório Gerencial`, 14, H - 8);
    doc.text(`Página ${i} de ${pages}`, W - 14, H - 8, { align: "right" });
  }

  doc.save(`Relatorio-Dashboard_${format(start, "ddMMyy")}-${format(end, "ddMMyy")}.pdf`);
}
