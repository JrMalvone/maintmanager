import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Sector {
  id: string;
  name: string;
  description: string | null;
  work_center_electronic: string | null;
  work_center_mechanical: string | null;
}

export function SectorsTab() {
  const { toast } = useToast();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [wcElectronic, setWcElectronic] = useState("");
  const [wcMechanical, setWcMechanical] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetchSectors();
  }, []);

  async function fetchSectors() {
    const { data } = await supabase.from("sectors").select("*").order("name");
    if (data) setSectors(data);
    setLoading(false);
  }

  function openCreate() {
    setSelectedSector(null);
    setName("");
    setDescription("");
    setWcElectronic("");
    setWcMechanical("");
    setDialogOpen(true);
  }

  function openEdit(sector: Sector) {
    setSelectedSector(sector);
    setName(sector.name);
    setDescription(sector.description || "");
    setWcElectronic(sector.work_center_electronic || "");
    setWcMechanical(sector.work_center_mechanical || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      work_center_electronic: wcElectronic.trim().toUpperCase() || null,
      work_center_mechanical: wcMechanical.trim().toUpperCase() || null,
    };

    try {
      if (selectedSector) {
        const { error } = await supabase
          .from("sectors")
          .update(payload)
          .eq("id", selectedSector.id);
        if (error) throw error;
        toast({ title: "Setor atualizado" });
      } else {
        const { error } = await supabase.from("sectors").insert(payload);
        if (error) throw error;
        toast({ title: "Setor criado" });
      }
      setDialogOpen(false);
      fetchSectors();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function openDelete(sector: Sector) {
    // Check if sector has machines
    const { count } = await supabase
      .from("machines")
      .select("*", { count: "exact", head: true })
      .eq("sector_id", sector.id);

    if (count && count > 0) {
      setDeleteError(`Este setor possui ${count} máquina(s) vinculada(s). Remova ou mova as máquinas antes de excluir.`);
    } else {
      setDeleteError("");
    }
    setSelectedSector(sector);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!selectedSector || deleteError) return;
    try {
      const { error } = await supabase.from("sectors").delete().eq("id", selectedSector.id);
      if (error) throw error;
      toast({ title: "Setor excluído" });
      setDeleteDialogOpen(false);
      fetchSectors();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Setores da Fábrica</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Setor
        </Button>
      </div>

      <div className="industrial-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Centro Elétrica</TableHead>
              <TableHead>Centro Mecânica</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum setor cadastrado
                </TableCell>
              </TableRow>
            ) : (
              sectors.map((sector) => (
                <TableRow key={sector.id}>
                  <TableCell className="font-medium">{sector.name}</TableCell>
                  <TableCell className="text-muted-foreground">{sector.description || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(sector)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(sector)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
            <DialogTitle>{selectedSector ? "Editar Setor" : "Novo Setor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Setor *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Prensas, Embalagem" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError ? (
                <span className="text-destructive">{deleteError}</span>
              ) : (
                <>Tem certeza que deseja excluir o setor <strong>{selectedSector?.name}</strong>? Esta ação não pode ser desfeita.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
