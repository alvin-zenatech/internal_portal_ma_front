import { toast } from "sonner";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import { useState } from "react";
import { 
  useDoNotContactList, 
  useCreateDoNotContact, 
  useUpdateDoNotContact, 
  useDeleteDoNotContact,
  useCompanies
} from "@/hooks/usePipeline";
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function DoNotContact() {

  const handleExportDnc = () => {
    try {
      const dataToExport = filteredList || [];
      const cols: ExportColumn<any>[] = [
        { header: "Company Name", accessor: (r) => r.company_name || "" },
        { header: "Reason / Notes", accessor: (r) => r.reason || "" },
        { header: "Date Added", accessor: (r) => r.created_at || "" },
      ];
      exportToCsv(dataToExport.length > 0 ? dataToExport : (dncList || []), cols, "do_not_contact_list");
      toast.success("Do Not Contact list exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export Do Not Contact list");
    }
  };

  const { data: dncList, isLoading } = useDoNotContactList();
  const createDnc = useCreateDoNotContact();
  const updateDnc = useUpdateDoNotContact();
  const deleteDnc = useDeleteDoNotContact();
  const { data: companies } = useCompanies();
  const companyOptions = companies?.map(c => ({ id: c.name, name: c.name })) || [];

  const [searchTerm, setSearchTerm] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newReason, setNewReason] = useState("");

  const [editRecord, setEditRecord] = useState<{ id: number; company_name: string; reason: string } | null>(null);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredList = dncList?.filter((record) => 
    record.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    if (!newCompanyName.trim()) return;
    createDnc.mutate({ company_name: newCompanyName, reason: newReason }, {
      onSuccess: () => {
        setIsAddOpen(false);
        setNewCompanyName("");
        setNewReason("");
      }
    });
  };

  const handleUpdate = () => {
    if (!editRecord || !editRecord.company_name.trim()) return;
    updateDnc.mutate({ id: editRecord.id, data: { company_name: editRecord.company_name, reason: editRecord.reason } }, {
      onSuccess: () => {
        setEditRecord(null);
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDnc.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="h-full flex flex-col w-full min-h-0 bg-background">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b bg-card shrink-0">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-red-600 dark:text-red-500 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Do Not Contact List
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Companies explicitly marked as 'Do Not Contact'. These companies are flagged across the pipeline.
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-2.5 sm:p-4 md:p-5 space-y-3 min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative w-full sm:w-64 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search company..."
                className="pl-8 h-8.5 sm:h-9 text-xs sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap ml-auto sm:ml-0">
              <Button variant="outline" size="sm" onClick={handleExportDnc} className="gap-1.5 h-8.5 sm:h-9 text-xs">
                <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Export CSV
              </Button>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 h-8.5 sm:h-9 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[92vw] max-w-md p-4 sm:p-6 bg-card">
                  <DialogHeader>
                    <DialogTitle className="text-base sm:text-lg">Add Do Not Contact Record</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Company Name</Label>
                      <AutocompleteCombobox
                        value={newCompanyName}
                        onChange={(v) => setNewCompanyName(v as string)}
                        options={companyOptions}
                        onCreate={async (name) => name}
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm">Reason (Optional)</Label>
                      <Input 
                        value={newReason} 
                        onChange={(e) => setNewReason(e.target.value)} 
                        placeholder="e.g. Requested removal"
                        className="h-8.5 sm:h-9 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreate} disabled={!newCompanyName.trim() || createDnc.isPending}>
                      {createDnc.isPending ? "Saving..." : "Save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="rounded-md border bg-card flex-1 shadow-xs overflow-hidden flex flex-col min-h-[260px]">
            <div className="overflow-auto flex-1">
              <Table containerClassName="none">
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-[260px] py-2 text-xs font-semibold">Company Name</TableHead>
                    <TableHead className="py-2 text-xs font-semibold">Reason / Notes</TableHead>
                    <TableHead className="w-[180px] py-2 text-xs font-semibold">Date Added</TableHead>
                    <TableHead className="w-[90px] text-right py-2 text-xs font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredList?.length ? (
                filteredList.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {record.company_name}
                        <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold">DNC</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.reason || <span className="italic opacity-50">No reason provided</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditRecord({ id: record.id, company_name: record.company_name, reason: record.reason || "" })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {searchTerm ? "No matching records found." : "The Do Not Contact list is empty."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      </div>
      </div>

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Do Not Contact Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <AutocompleteCombobox
                value={editRecord?.company_name || ""}
                onChange={(v) => setEditRecord(prev => prev ? { ...prev, company_name: v as string } : null)}
                options={companyOptions}
                onCreate={async (name) => name}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input 
                value={editRecord?.reason || ""} 
                onChange={(e) => setEditRecord(prev => prev ? { ...prev, reason: e.target.value } : null)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!editRecord?.company_name.trim() || updateDnc.isPending}>
              {updateDnc.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove from Do Not Contact"
        description="Are you sure you want to remove this company from the Do Not Contact list? They will no longer be highlighted."
        isLoading={deleteDnc.isPending}
      />
    </div>
  );
}
