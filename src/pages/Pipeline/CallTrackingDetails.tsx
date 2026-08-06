import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIndustries, useCallTrackingSummary, useCompanyCallLogs, useCreateCallLog, useUpdateCallLog, useDeleteCallLog, type CallLog } from '@/hooks/usePipeline';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function CallTrackingDetails({ 
  companyName, 
  normalizedName, 
  onClose 
}: { 
  companyName: string, 
  normalizedName: string | null, 
  onClose: () => void 
}) {
  const { data: logs, isLoading } = useCompanyCallLogs(normalizedName);
  const { mutateAsync: createLog } = useCreateCallLog();
  const { mutateAsync: updateLog } = useUpdateCallLog();
  const { mutateAsync: deleteLog } = useDeleteCallLog();

  const { data: industriesData } = useIndustries();
  const { data: summaries } = useCallTrackingSummary();
  const existingOutcomes = Array.from(new Set(summaries?.map(s => s.current_status).filter(Boolean))) as string[];


  const [editingId, setEditingId] = useState<number | 'NEW' | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CallLog>>({});

  useEffect(() => {
    if (!normalizedName) {
      setFormData({ company_name: companyName });
      setEditingId('NEW');
    }
  }, [normalizedName, companyName]);


  const handleEdit = (log?: CallLog) => {
    if (log) {
      setFormData(log);
      setEditingId(log.id);
    } else {
      setFormData({ company_name: companyName });
      setEditingId('NEW');
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.company_name) {
        toast.error("Company name is required.");
        return;
      }

      if (editingId === 'NEW') {
        await createLog(formData);
        toast.success("Call log created!");
        if (!normalizedName) {
           onClose(); // newly created company, close sheet to refresh view
           return;
        }
      } else if (editingId) {
        await updateLog({ id: editingId, payload: formData });
        toast.success("Call log updated!");
      }
      setEditingId(null);
    } catch (e) {
      toast.error("Failed to save call log.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteLog(id);
      toast.success("Call log deleted!");
    } catch (e) {
      toast.error("Failed to delete call log.");
    }
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:!max-w-3xl md:!max-w-4xl lg:!max-w-5xl overflow-y-auto !p-0 bg-slate-50">
        <SheetHeader className="border-b px-6 py-4 shrink-0 bg-white sticky top-0 z-10 shadow-sm">
          <SheetTitle>{normalizedName ? `Call Tracking: ${companyName}` : 'Add New Call Tracking'}</SheetTitle>
          <SheetDescription>
            View and manage activity logs for this company.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div>Loading logs...</div>
        ) : (
          <div className="space-y-6 p-6 pb-24">
            {!editingId && (
              <Button onClick={() => handleEdit()}>+ Add New Log</Button>
            )}

            {editingId && (
              <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
                <h3 className="font-medium">{editingId === 'NEW' ? 'Create Log' : 'Edit Log'}</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 text-left w-full">
                    <label>Company Name *</label>
                    <Input 
                      value={formData.company_name || ''} 
                      onChange={e => setFormData({...formData, company_name: e.target.value})}
                      disabled={normalizedName !== null} // Lock name if editing an existing company
                    />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Date of Call</label>
                    <Input type="date" value={formData.date_of_call ? formData.date_of_call.split("T")[0] : ''} onChange={e => setFormData({...formData, date_of_call: e.target.value})} />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Outcome / Status</label>
                    <Select value={formData.outcome || ''} onValueChange={val => setFormData({...formData, outcome: val})}>
                      <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                      <SelectContent>
                        {existingOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Contact Name</label>
                    <Input 
                      value={formData.contact_name || ''} 
                      onChange={e => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Position</label>
                    <Input 
                      value={formData.position || ''} 
                      onChange={e => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Industry</label>
                    <Select value={formData.industry || ''} onValueChange={val => setFormData({...formData, industry: val})}>
                      <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                      <SelectContent>
                        {industriesData?.map(ind => <SelectItem key={ind.id} value={ind.name}>{ind.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1 text-left w-full">
                  <label>Notes</label>
                  <Textarea 
                    value={formData.notes || ''} 
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </div>
            )}

            {!editingId && logs?.map(log => (
              <div key={log.id} className="bg-white border p-4 rounded-lg shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-slate-500 font-medium">{log.date_of_call || 'No Date'}</span>
                    <h4 className="font-semibold">{log.outcome || 'No Outcome specified'}</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(log)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeletingId(log.id)}>Delete</Button>
                  </div>
                </div>
                
                <div className="text-sm text-slate-700 whitespace-pre-wrap mt-2">
                  {log.notes}
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-500 bg-slate-50 p-2 rounded">
                  <div>Contact: {log.contact_name} {log.position ? `(${log.position})` : ''}</div>
                  <div>Phone: {log.phone_number}</div>
                  <div>Emailed: {log.emailed} | Picked up: {log.picked_up}</div>
                  <div>Analyst: {log.analyst}</div>
                </div>
              </div>
            ))}
            
            {logs?.length === 0 && !editingId && (
              <div className="text-center text-slate-500 p-8 border border-dashed rounded-lg">
                No activity logs yet.
              </div>
            )}
          </div>
        )}
      </SheetContent>
      <ConfirmDialog 
        open={deletingId !== null} 
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete log?" 
        description="Are you sure you want to delete this activity log? This cannot be undone."
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
          setDeletingId(null);
        }}
      />
    </Sheet>
  );
}


