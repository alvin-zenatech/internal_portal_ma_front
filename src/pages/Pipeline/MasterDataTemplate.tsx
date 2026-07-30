import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function MasterDataTemplate({ title, data, isLoading, onCreate, onDelete, onUpdate, hasSortOrder = false, hasCode = false, hasColor = false }: any) {
  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#64748b");
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [editCode, setEditCode] = useState("");
  const [editColor, setEditColor] = useState("#64748b");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const payload: any = { name: newName.trim() };
      if (hasSortOrder) {
        const maxSort = data?.length ? Math.max(...data.map((d: any) => d.sort_order || 0)) : 0;
        payload.sort_order = maxSort + 10;
      }
      if (hasCode) payload.code = code.trim();
      if (hasColor) payload.color = color;
      
      await onCreate(hasSortOrder || hasCode || hasColor ? payload : newName.trim());
      setNewName("");
      setCode("");
      setColor("#64748b");
      toast.success(`${title} created successfully.`);
    } catch (error) {
      toast.error(`Failed to create ${title}.`);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSortOrder(item.sort_order || 0);
    setEditCode(item.code || "");
    setEditColor(item.color || "#64748b");
  };

  const handleUpdate = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      const payload: any = { name: editName.trim() };
      if (hasSortOrder) payload.sort_order = editSortOrder;
      if (hasCode) payload.code = editCode.trim();
      if (hasColor) payload.color = editColor;
      
      await onUpdate({ id: editingId, data: payload });
      setEditingId(null);
      toast.success(`${title} updated successfully.`);
    } catch (error) {
      toast.error(`Failed to update ${title}.`);
    }
  };

  const handleDeleteRequest = (id: number) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (itemToDelete !== null) {
      try {
        await onDelete(itemToDelete);
        toast.success(`${title} deleted successfully.`);
      } catch (error) {
        toast.error(`Failed to delete ${title}.`);
      }
      setItemToDelete(null);
    }
  };

  const renderColorPicker = (selected: string, onSelect: (c: string) => void) => (
    <div className="flex items-center gap-2 bg-muted/50 p-1 pr-3 rounded-md border shadow-sm w-fit">
      <input 
        type="color" 
        value={selected || '#64748b'} 
        onChange={(e) => onSelect(e.target.value)} 
        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
      />
      <span className="text-xs font-medium text-foreground uppercase">{selected || '#64748b'}</span>
    </div>
  );

  return (
    <div className="p-8 w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title} Management</h1>
          <p className="text-muted-foreground mt-2">Manage available options for {title.toLowerCase()}s in the pipeline.</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-muted/30">
          <form onSubmit={handleCreate} className="flex flex-col gap-4 max-w-3xl">
            <div className="flex gap-4">
              <Input 
                placeholder={`New ${title} name...`} 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="flex-1"
              />
              {hasCode && (
                <Input placeholder="Code (e.g. AUS)" value={code} onChange={(e) => setCode(e.target.value)} className="w-32" required />
              )}
              <Button type="submit" disabled={!newName.trim()}>Add {title}</Button>
            </div>
            {hasColor && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-sm font-medium text-muted-foreground">Priority Color:</span>
                {renderColorPicker(color, setColor)}
              </div>
            )}
          </form>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {hasCode && <TableHead>Code</TableHead>}
              {hasColor && <TableHead>Color</TableHead>}
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : data?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No {title.toLowerCase()}s found.</TableCell></TableRow>
            ) : (
              data?.map((item: any) => {
                const isEditing = editingId === item.id;
                return (
                  <TableRow key={item.id} className="group cursor-pointer hover:bg-muted/50 transition-colors" onClick={(e) => {
                    if (!isEditing && !(e.target as HTMLElement).closest('button')) {
                      handleEditClick(item);
                    }
                  }}>
                    <TableCell>
                      {isEditing ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} autoFocus className="h-8" />
                      ) : <span className="font-medium">{item.name}</span>}
                    </TableCell>

                    {hasCode && (
                      <TableCell>
                        {isEditing ? (
                          <Input value={editCode} onChange={e => setEditCode(e.target.value)} className="h-8 w-24" />
                        ) : item.code}
                      </TableCell>
                    )}

                    {hasColor && (
                      <TableCell>
                        {isEditing ? (
                          renderColorPicker(editColor, setEditColor)
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: item.color || '#64748b' }} />
                            <span className="text-xs text-muted-foreground uppercase">{item.color || '#64748b'}</span>
                          </div>
                        )}
                      </TableCell>
                    )}

                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleUpdate(); }} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteRequest(item.id); }} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog 
        open={itemToDelete !== null} 
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title={`Delete ${title}`}
        description={`Are you sure you want to delete this ${title}? This action cannot be undone.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
