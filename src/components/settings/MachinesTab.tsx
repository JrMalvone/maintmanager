import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface Machine {
  id: string;
  code: string;
  model: string | null;
  manufacturer: string | null;
  sector_id: string | null;
  status: string;
}

interface Sector {
  id: string;
  name: string;
}

export function MachinesTab() {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [code, setCode] = useState("");
  const [model, setModel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [filterSector, setFilterSector] = useState("all");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [machinesRes, sectorsRes] = await Promise.all([
      supabase.from("machines").select("*").order("code"),
      supabase.from("sectors").select("id, name").order("name"),
    ]);
    if (machinesRes.data) setMachines(machinesRes.data as Machine[]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    setLoading(false);
  }

  function openCreate() {
    setSelectedMachine(null);
    setCode("");
    setModel("");
    setManufacturer("");
    setSectorId("");
    setStatus("active");
    setDialogOpen(true);
  }

  function openEdit(machine: Machine) {
    setSelectedMachine(machine);
    setCode(machine.code);
    setModel(machine.model || "");
    setManufacturer(machine.manufacturer || "");
    setSectorId(machine.sector_id || "");
    setStatus(machine.status);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!code.trim()) return;
    setSaving(true);

    const payload = {
      code: code.trim(),
      model: model.trim() || null,
      manufacturer: manufacturer.trim() || null,
      sector_id: sectorId || null,
      status,
    };

    try {
      if (selectedMachine) {
        const { error } = await supabase.from("machines").update(payload).eq("id", selectedMachine.id);
        if (error) throw error;
        toast({ title: "Máquina atualizada" });
      } else {
        const { error } = await supabase.from("machines").insert(payload);
        if (error) throw error;
        toast({ title: "Máquina criada" });
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(machine: Machine) {
    const newStatus = machine.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("machines").update({ status: newStatus }).eq("id", machine.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  }

  function showQR(machine: Machine) {
    setSelectedMachine(machine);
    setQrDialogOpen(true);
  }

  function printQR() {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Code - ${selectedMachine?.code}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}h2{margin-bottom:8px;}p{color:#666;margin-top:0;}</style>
      </head><body>
      <h2>${selectedMachine?.code}</h2>
      <p>${selectedMachine?.model || ""}</p>
      ${svgData}
      <script>window.print();window.close();</script>
      </body></html>
    `);
    win.document.close();
  }

  const getSectorName = (sectorId: string | null) => {
    if (!sectorId) return "—";
    return sectors.find((s) => s.id === sectorId)?.name || "—";
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Máquinas</h2>
        <div className="flex gap-2">
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os setores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Máquina
          </Button>
        </div>
      </div>

      <div className="industrial-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma máquina cadastrada
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine) => (
                <TableRow key={machine.id} className={machine.status === "inactive" ? "opacity-50" : ""}>
                  <TableCell className="font-mono font-bold">{machine.code}</TableCell>
                  <TableCell>{machine.model || "—"}</TableCell>
                  <TableCell>{getSectorName(machine.sector_id)}</TableCell>
                  <TableCell>
                    <Badge variant={machine.status === "active" ? "default" : "secondary"}>
                      {machine.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(machine)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => showQR(machine)}>
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={machine.status === "active"}
                        onCheckedChange={() => toggleStatus(machine)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMachine ? "Editar Máquina" : "Nova Máquina"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código / Tag *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: PH-01" />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: Prensa Hidráulica 01" />
            </div>
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Ex: WEG" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Status Ativa</Label>
              <Switch checked={status === "active"} onCheckedChange={(v) => setStatus(v ? "active" : "inactive")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !code.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — {selectedMachine?.code}</DialogTitle>
          </DialogHeader>
          <div ref={qrRef} className="flex flex-col items-center gap-4 py-4">
            <QRCodeSVG value={selectedMachine?.id || ""} size={200} level="H" />
            <p className="text-sm text-muted-foreground">{selectedMachine?.model}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>Fechar</Button>
            <Button onClick={printQR}>Imprimir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
