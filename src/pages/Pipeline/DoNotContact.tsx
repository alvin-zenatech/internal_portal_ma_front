import { useState } from "react";
import { 
  useDoNotContactList, 
  useCreateDoNotContact, 
  useUpdateDoNotContact, 
  useDeleteDoNotContact 
} from "@/hooks/usePipeline";
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
  const { data: dncList, isLoading } = useDoNotContactList();
  const createDnc = useCreateDoNotContact();
  const updateDnc = useUpdateDoNotContact();
  const deleteDnc = useDeleteDoNotContact();

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
    <div className="flex-1 space-y-4 p-8 pt-6 w-full h-full flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-600 dark:text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Do Not Contact List
          </h2>
          <p className="text-muted-foreground mt-1">
            Companies that have been explicitly marked as 'Do Not Contact'. These companies will be highlighted in the Pipeline Dashboard.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search company..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Record
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Do Not Contact Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={newCompanyName} 
                  onChange={(e) => setNewCompanyName(e.target.value)} 
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Input 
                  value={newReason} 
                  onChange={(e) => setNewReason(e.target.value)} 
                  placeholder="e.g. Requested removal"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newCompanyName.trim() || createDnc.isPending}>
                {createDnc.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card flex-1 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Company Name</TableHead>
                <TableHead>Reason / Notes</TableHead>
                <TableHead className="w-[200px]">Date Added</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
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

      <Dialog open={!!editRecord} onOpenChange={(open) => !open && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Do Not Contact Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={editRecord?.company_name || ""} 
                onChange={(e) => setEditRecord(prev => prev ? { ...prev, company_name: e.target.value } : null)} 
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
