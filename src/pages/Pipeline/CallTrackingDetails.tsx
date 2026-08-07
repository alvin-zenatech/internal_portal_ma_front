import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIndustries, usePositions, useCallTrackingSummary, useCompanyCallLogs, useCreateCallLog, useUpdateCallLog, useDeleteCallLog, type CallLog, useUsers, useAnalysts } from '@/hooks/usePipeline';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Loader2 } from "lucide-react";

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
  const { mutateAsync: createLog, isPending: isCreatingLog } = useCreateCallLog();
  const { mutateAsync: updateLog, isPending: isUpdatingLog } = useUpdateCallLog();
  const { mutateAsync: deleteLog, isPending: isDeletingLog } = useDeleteCallLog();
  const isPending = isCreatingLog || isUpdatingLog;

  const { data: industriesData } = useIndustries();
  const { data: positionsData } = usePositions();
  const { data: users } = useUsers();
  const { data: analysts } = useAnalysts();
  
  const getAnalystName = (initials?: string | null) => {
    if (!initials) return '-';
    if (!users) return initials;
    const exactUser = users.find(u => u.full_name.toLowerCase() === initials.toLowerCase());
    if (exactUser) return exactUser.full_name;

    const upperInit = initials.toUpperCase();
    const user = users.find(u => {
      const parts = u.full_name.trim().split(/\s+/);
      const computed = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
        : u.full_name[0].toUpperCase();
      return computed === upperInit;
    });
    return user ? user.full_name : initials;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [m, d, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr.split(/[T ]/)[0];
  };
  useCallTrackingSummary();
  const existingOutcomes = [
    "Follow Up",
    "Voicemail",
    "Not Interested",
    "Meeting Scheduled",
    "Call Invalid",
    "Receptionist took message",
    "Wrong Number",
    "No Answer",
    "Sent Information",
  ];

  const [editingId, setEditingId] = useState<number | 'NEW' | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<CallLog>>({});

  const currentOutcome = formData.outcome || '';
  const currentPosition = React.useMemo(() => {
    if (!formData.position) return '';
    const match = positionsData?.find(p => p.name.toLowerCase() === formData.position?.toLowerCase());
    return match ? match.name : formData.position;
  }, [formData.position, positionsData]);
  
  const currentIndustry = React.useMemo(() => {
    if (!formData.industry) return '';
    const match = industriesData?.find(ind => ind.name.toLowerCase() === formData.industry?.toLowerCase());
    return match ? match.name : formData.industry;
  }, [formData.industry, industriesData]);

  const currentAnalyst = React.useMemo(() => {
    if (!formData.analyst) return '';
    return getAnalystName(formData.analyst);
  }, [formData.analyst, users]);


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
                  {/* Row 1: Company Name, Industry */}
                  <div className="space-y-1 text-left w-full">
                    <label>Company Name *</label>
                    <Input 
                      value={formData.company_name || ''} 
                      onChange={e => setFormData({...formData, company_name: e.target.value})}
                      disabled={normalizedName !== null} // Lock name if editing an existing company
                    />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Industry</label>
                    <Select value={currentIndustry} onValueChange={val => setFormData({...formData, industry: val})}>
                      <SelectTrigger><SelectValue placeholder="Select industry..." /></SelectTrigger>
                      <SelectContent>
                        {industriesData?.map(ind => <SelectItem key={ind.id} value={ind.name}>{ind.name}</SelectItem>)}
                        {currentIndustry && !industriesData?.find(i => i.name === currentIndustry) && (
                          <SelectItem value={currentIndustry}>{currentIndustry}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 2: Contact Name, Position */}
                  <div className="space-y-1 text-left w-full">
                    <label>Contact Name</label>
                    <Input 
                      value={formData.contact_name || ''} 
                      onChange={e => setFormData({...formData, contact_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Position</label>
                    <Select value={currentPosition} onValueChange={val => setFormData({...formData, position: val})}>
                      <SelectTrigger><SelectValue placeholder="Select position..." /></SelectTrigger>
                      <SelectContent>
                        {positionsData?.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                        {currentPosition && !positionsData?.find(p => p.name === currentPosition) && (
                          <SelectItem value={currentPosition}>{currentPosition}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 3: Date of Call, Outcome */}
                  <div className="space-y-1 text-left w-full">
                    <label>Date of Call</label>
                    <Input type="date" value={formatDate(formData.date_of_call)} onChange={e => setFormData({...formData, date_of_call: e.target.value})} />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label>Outcome / Status</label>
                    <Select value={currentOutcome} onValueChange={val => setFormData({...formData, outcome: val})}>
                      <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                      <SelectContent>
                        {existingOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        {currentOutcome && !existingOutcomes.includes(currentOutcome) && (
                          <SelectItem value={currentOutcome}>{currentOutcome}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1 text-left w-full">
                  <label>Analyst</label>
                  <Select value={currentAnalyst} onValueChange={val => setFormData({...formData, analyst: val})}>
                    <SelectTrigger><SelectValue placeholder="Select analyst..." /></SelectTrigger>
                    <SelectContent>
                      {analysts?.map(u => (
                        <SelectItem key={u.id} value={u.full_name || ''}>{u.full_name}</SelectItem>
                      ))}
                      {currentAnalyst && !analysts?.find(u => u.full_name === currentAnalyst) && (
                        <SelectItem value={currentAnalyst}>{currentAnalyst}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
                  <Button variant="outline" onClick={() => setEditingId(null)} disabled={isPending}>Cancel</Button>
                  <Button onClick={handleSave} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {!editingId && logs?.map(log => (
              <div key={log.id} className="bg-white border p-4 rounded-lg shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm text-slate-500 font-medium">{formatDate(log.date_of_call) || 'No Date'}{log.call_length ? ` • ${log.call_length}` : ''}</span>
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
                  <div>Analyst: {getAnalystName(log.analyst)}</div>
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
        isLoading={isDeletingLog}
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
          setDeletingId(null);
        }}
      />
    </Sheet>
  );
}


