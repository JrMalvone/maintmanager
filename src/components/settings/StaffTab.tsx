import { useState, useEffect } from "react";
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
import { Plus, Pencil, Loader2 } from "lucide-react";

interface Staff {
  id: string;
  name: string;
  registration_number: string;
  specialty: string;
  status: string;
  preferred_sector_id: string | null;
}

interface Sector {
  id: string;
  name: string;
}

const SPECIALTY_LABELS: Record<string, string> = {
  mechanical: "Mecânico",
  electronic: "Eletricista",
  both: "Ambos",
};

export function StaffTab() {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [specialty, setSpecialty] = useState("mechanical");
  const [status, setStatus] = useState("active");
  const [preferredSectorId, setPreferredSectorId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [staffRes, sectorsRes] = await Promise.all([
      supabase.from("maintenance_staff").select("*").order("name"),
      supabase.from("sectors").select("id, name").order("name"),
    ]);
    if (staffRes.data) setStaff(staffRes.data as Staff[]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    setLoading(false);
  }

  function openCreate() {
    setSelectedStaff(null);
    setName("");
    setRegistrationNumber("");
    setSpecialty("mechanical");
    setStatus("active");
    setPreferredSectorId("");
    setDialogOpen(true);
  }

  function openEdit(s: Staff) {
    setSelectedStaff(s);
    setName(s.name);
    setRegistrationNumber(s.registration_number);
    setSpecialty(s.specialty);
    setStatus(s.status);
    setPreferredSectorId(s.preferred_sector_id || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !registrationNumber.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      registration_number: registrationNumber.trim(),
      specialty,
      status,
      preferred_sector_id: preferredSectorId || null,
    };

    try {
      if (selectedStaff) {
        const { error } = await supabase.from("maintenance_staff").update(payload).eq("id", selectedStaff.id);
        if (error) throw error;
        toast({ title: "Funcionário atualizado" });
      } else {
        const { error } = await supabase.from("maintenance_staff").insert(payload);
        if (error) throw error;
        toast({ title: "Funcionário cadastrado" });
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(s: Staff) {
    const newStatus = s.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("maintenance_staff").update({ status: newStatus }).eq("id", s.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Equipe de Manutenção</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <div className="industrial-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Setor Preferido</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum funcionário cadastrado
                </TableCell>
              </TableRow>
            ) : (
              staff.map((s) => (
                <TableRow key={s.id} className={s.status === "inactive" ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="font-mono">{s.registration_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{SPECIALTY_LABELS[s.specialty] || s.specialty}</Badge>
                  </TableCell>
                  <TableCell>{getSectorName(s.preferred_sector_id)}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>
                      {s.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 items-center">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={s.status === "active"}
                        onCheckedChange={() => toggleStatus(s)}
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
            <DialogTitle>{selectedStaff ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Matrícula *</Label>
              <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder="Número do registro" />
            </div>
            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mechanical">Mecânico</SelectItem>
                  <SelectItem value="electronic">Eletricista</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Setor Preferido (opcional)</Label>
              <Select value={preferredSectorId} onValueChange={setPreferredSectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={status === "active"} onCheckedChange={(v) => setStatus(v ? "active" : "inactive")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim() || !registrationNumber.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
