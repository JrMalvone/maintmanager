import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { ServiceOrder } from "@/hooks/useData";
import type { WorkLog } from "@/hooks/useWorkLogs";

const dt = (s?: string | null) => (s ? format(new Date(s), "dd/MM/yyyy HH:mm") : "—");
const fmtMin = (m: number) => (m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);
const STATUS: Record<string, string> = { open: "Aberta", in_progress: "Em Andamento", closed: "Fechada" };

interface MachineInfo { code?: string; model?: string | null; manufacturer?: string | null; sectorName?: string | null }

export function exportOrderPdf(order: ServiceOrder, machine: MachineInfo | null, workLogs: WorkLog[], aiDiagnosis?: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const dark: [number, number, number] = [30, 41, 59];

  doc.setFillColor(...dark);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Ficha de Ordem de Serviço de Manutenção", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`OS #${order.id.slice(0, 8)}   |   Nota SAP: ${order.sap_notification_number || "—"}   |   Status: ${STATUS[order.status]}`, 14, 20);
  doc.text(`Emitido em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, W - 14, 20, { align: "right" });
  doc.setTextColor(0, 0, 0);

  const downtime = order.is_machine_stopped && order.finished_at
    ? fmtMin((new Date(order.finished_at).getTime() - new Date(order.created_at).getTime()) / 60000) : "—";
  const manMin = workLogs.reduce((a, l) => a + (l.duration_minutes || 0), 0);

  const section = (title: string, rows: [string, string][]) => {
    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY ?? 26) + 6,
      head: [[{ content: title, colSpan: 2 }]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: dark, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 55, fillColor: [241, 245, 249] } },
      margin: { left: 14, right: 14 },
    });
  };

  section("Identificação do Equipamento", [
    ["Máquina", machine?.code || "—"],
    ["Modelo / Fabricante", [machine?.model, machine?.manufacturer].filter(Boolean).join(" - ") || "—"],
    ["Setor", machine?.sectorName || "—"],
    ["Centro de Trabalho", order.work_center || "—"],
  ]);
  section("Classificação Técnica", [
    ["Tipo de Corretiva", order.is_machine_stopped ? "Corretiva Emergencial (Máquina Parada)" : "Corretiva Programada"],
    ["Categoria do Defeito", order.maintenance_type === "electronic" ? "Elétrico" : order.maintenance_type === "mechanical" ? "Mecânico" : "—"],
    ["Solicitante", [order.opener_name, order.opener_registry].filter(Boolean).join(" - ") || "—"],
  ]);
  section("Métricas de Tempo", [
    ["Abertura", dt(order.created_at)],
    ["Início do Atendimento", dt(order.started_at)],
    ["Encerramento", dt(order.finished_at)],
    ["Tempo de Máquina Parada", downtime],
    ["Homem-Hora Total", fmtMin(manMin)],
  ]);
  const desc: [string, string][] = [
    ["Problema Relatado", order.problem_description || "—"],
    ["Solução Final", order.solution_description || "—"],
  ];
  if (aiDiagnosis) desc.splice(1, 0, ["Diagnóstico IA", aiDiagnosis.replace(/[#*`]/g, "").slice(0, 3000)]);
  section("Descrição e Diagnóstico", desc);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Técnico", "Entrada", "Saída", "Duração", "Relato"]],
    body: workLogs.length
      ? [...workLogs].sort((a, b) => a.started_at.localeCompare(b.started_at)).map((l) => [
          [l.technician_name, l.technician_registry].filter(Boolean).join("\n"),
          dt(l.started_at), dt(l.ended_at),
          l.duration_minutes != null ? fmtMin(l.duration_minutes) : "Em andamento",
          l.notes || "",
        ])
      : [["Sem apontamentos", "", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: dark, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 27 }, 2: { cellWidth: 27 }, 3: { cellWidth: 20 } },
    margin: { left: 14, right: 14 },
  });

  let y = (doc as any).lastAutoTable.finalY + 25;
  if (y > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 40; }
  doc.setFontSize(9);
  doc.line(20, y, 90, y);
  doc.line(W - 90, y, W - 20, y);
  doc.text("Técnico Responsável", 55, y + 5, { align: "center" });
  doc.text("Gestor da Manutenção", W - 55, y + 5, { align: "center" });

  doc.save(`OS_${order.id.slice(0, 8)}.pdf`);
}
