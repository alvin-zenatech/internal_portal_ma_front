import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIndustries, useCallTrackingSummary, useCompanyCallLogs, useCreateCallLog, useUpdateCallLog, useDeleteCallLog, type CallLog, useAnalysts, useCompanies, useCreateCompany } from '@/hooks/usePipeline';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatYesNo, formatPhoneNumber } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Loader2 } from "lucide-react";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

export default function CallTrackingDetails({ 
  companyName, 
  normalizedName, 
  initialEditId,
  onClose 
}: { 
  companyName: string, 
  normalizedName: string | null, 
  initialEditId?: number | null,
  onClose: () => void 
}) {
  const { data: logs, isLoading } = useCompanyCallLogs(normalizedName);
  const { mutateAsync: createLog, isPending: isCreatingLog } = useCreateCallLog();
  const { mutateAsync: updateLog, isPending: isUpdatingLog } = useUpdateCallLog();
  const { mutateAsync: deleteLog, isPending: isDeletingLog } = useDeleteCallLog();
  const isPending = isCreatingLog || isUpdatingLog;

  const { data: industriesData } = useIndustries();

  const { data: analysts } = useAnalysts();
  
  const getAnalystName = (initials?: string | null) => {
    if (!initials) return '-';
    const upperInit = initials.toUpperCase();
    if (!analysts) return upperInit;

    const exactUser = analysts.find(u => u.full_name?.toLowerCase() === initials.toLowerCase());
    if (exactUser) return exactUser.full_name;

    const user = analysts.find(u => {
      const name = u.full_name || '';
      const parts = name.trim().split(/\s+/);
      const computed = parts.length >= 2 
        ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase()
        : (name[0] || '').toUpperCase();
      return computed === upperInit;
    });
    return user ? (user.full_name || upperInit) : upperInit;
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
  const { data: companies } = useCompanies();
  const { data: summaries } = useCallTrackingSummary();
  const { mutateAsync: createCompany } = useCreateCompany();

  const companyOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (companies) {
      for (const c of companies) {
        if (c.name?.trim()) {
          map.set(c.name.toLowerCase().trim(), { id: c.name, name: c.name });
        }
      }
    }
    if (summaries) {
      for (const s of summaries) {
        if (s.company_name?.trim() && !map.has(s.company_name.toLowerCase().trim())) {
          map.set(s.company_name.toLowerCase().trim(), { id: s.company_name, name: s.company_name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, summaries]);

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

  const handleCompanySelect = (val: string | number) => {
    const selectedName = String(val || "");
    const matchingCompany = companies?.find(
      c => c.name.toLowerCase() === selectedName.toLowerCase()
    );
    const matchingSummary = summaries?.find(
      s => s.company_name.toLowerCase() === selectedName.toLowerCase() ||
           s.normalized_company_name.toLowerCase() === selectedName.toLowerCase()
    );

    setFormData(prev => {
      const newName = matchingCompany?.name || matchingSummary?.company_name || selectedName;
      const newIndustry = prev.industry || matchingSummary?.industry || "";
      const newContact = prev.contact_name || matchingCompany?.contact_name || matchingSummary?.contact_name || "";
      
      let newPhone = prev.phone_number;
      if (!newPhone) {
        const rawPhone = matchingCompany?.phone || matchingSummary?.phone_number;
        if (rawPhone) {
          newPhone = (rawPhone.includes('(Personal)') || rawPhone.includes('(Office)')) ? rawPhone : `${rawPhone} (Office)`;
        }
      }

      return {
        ...prev,
        company_name: newName,
        industry: newIndustry,
        contact_name: newContact,
        phone_number: newPhone || "",
      };
    });
  };

  const currentOutcome = formData.outcome || '';

  
  const currentIndustry = React.useMemo(() => {
    if (!formData.industry) return '';
    const match = industriesData?.find(ind => ind.name.toLowerCase() === formData.industry?.toLowerCase());
    return match ? match.name : formData.industry;
  }, [formData.industry, industriesData]);

  const currentAnalyst = React.useMemo(() => {
    if (!formData.analyst) return '';
    return getAnalystName(formData.analyst);
  }, [formData.analyst, analysts]);


  useEffect(() => {
    if (!normalizedName) {
      setFormData({ company_name: companyName });
      setEditingId('NEW');
    }
  }, [normalizedName, companyName]);

  useEffect(() => {
    if (initialEditId && logs) {
      const logToEdit = logs.find(l => l.id === initialEditId);
      if (logToEdit && editingId !== initialEditId) {
        setFormData(logToEdit);
        setEditingId(logToEdit.id);
      }
    }
  }, [initialEditId, logs, editingId]);


  const handleCancel = () => {
    if (!normalizedName || !logs || logs.length === 0) {
      onClose();
    } else {
      setEditingId(null);
    }
  };

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

      const trimmedName = formData.company_name.trim();

      if (editingId === 'NEW') {
        const existsInCompanies = companies?.some(
          c => c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (!existsInCompanies && trimmedName) {
          try {
            await createCompany({
              name: trimmedName,
              contact_name: formData.contact_name || undefined,
              phone: formData.phone_number?.replace(/ \((Personal|Office)\)$/, '').trim() || undefined,
            });
          } catch (e) {
            console.error("Failed to auto-create company on save", e);
          }
        }

        const payload = {
          ...formData,
          company_name: trimmedName
        };

        await createLog(payload);
        toast.success("Call log created!");
        if (!normalizedName) {
           onClose(); // newly created company, close sheet to refresh view
           return;
        }
      } else if (editingId) {
        const payload = {
          ...formData,
          company_name: trimmedName
        };
        await updateLog({ id: editingId, payload });
        toast.success("Call log updated!");
      }
      onClose();
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

  const handleCallLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip non-digits and limit to 4 characters (mmss)
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);

    let formatted = val;
    // If more than 2 digits, format as minutes:seconds
    if (val.length > 2) {
      const minutes = val.slice(0, val.length - 2);
      const seconds = val.slice(-2);
      formatted = `${minutes}:${seconds}`;
    }
    setFormData({ ...formData, call_length: formatted });
  };

  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent className="w-full sm:!max-w-2xl md:!max-w-3xl lg:!max-w-4xl overflow-y-auto !p-0 bg-background">
        <SheetHeader className="border-b px-4 sm:px-6 py-3 sm:py-4 shrink-0 bg-card sticky top-0 z-10 shadow-xs">
          <SheetTitle className="text-base sm:text-lg">{normalizedName ? `Call Tracking: ${companyName}` : 'Add New Call Tracking'}</SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            View and manage activity logs for this company.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading logs...</div>
        ) : (
          <div className="space-y-4 p-3 sm:p-5 pb-20">
            {!editingId && (
              <div className="flex justify-between items-center mb-2">
                {logs && <div className="text-xs sm:text-sm text-muted-foreground font-medium">Total Call Logs: {logs.length}</div>}
                <Button size="sm" onClick={() => handleEdit()}>+ Add New Log</Button>
              </div>
            )}

            {editingId && (
              <div className="bg-card flex flex-col h-full rounded-lg border">
                <div className="sticky top-0 bg-card z-10 p-3 sm:p-4 border-b rounded-t-lg shadow-xs">
                  <h3 className="font-semibold text-sm sm:text-base">{editingId === 'NEW' ? 'Create Log' : 'Edit Log'}</h3>
                </div>
                
                <div className="p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    {/* Row 1: Company Name, Industry */}
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Company Name *</label>
                    {normalizedName !== null ? (
                      <Input 
                        value={formData.company_name || ''} 
                        disabled={true}
                        className="h-8.5 sm:h-9 text-xs sm:text-sm"
                      />
                    ) : (
                      <AutocompleteInput
                        value={formData.company_name || ''}
                        onChange={(name) => setFormData(prev => ({ ...prev, company_name: name }))}
                        onSelectOption={(opt) => handleCompanySelect(opt.name)}
                        options={companyOptions}
                        placeholder="Type company name..."
                        className="h-8.5 sm:h-9 text-xs sm:text-sm"
                      />
                    )}
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Industry</label>
                    <Select value={currentIndustry} onValueChange={val => setFormData({...formData, industry: val})}>
                      <SelectTrigger className="h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select industry..." /></SelectTrigger>
                      <SelectContent>
                        {industriesData?.map(ind => <SelectItem key={ind.id} value={ind.name}>{ind.name}</SelectItem>)}
                        {currentIndustry && !industriesData?.find(i => i.name === currentIndustry) && (
                          <SelectItem value={currentIndustry}>{currentIndustry}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Row 2: Contact Name */}
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Contact Name</label>
                    <Input 
                      value={formData.contact_name || ''} 
                      onChange={e => setFormData({...formData, contact_name: e.target.value})}
                      className="h-8.5 sm:h-9 text-xs sm:text-sm"
                    />
                  </div>
                  <div className="hidden">

                  </div>

                  {/* Row 3: Date of Call, Outcome */}
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Date of Call</label>
                    <Input type="date" className="h-8.5 sm:h-9 text-xs sm:text-sm" value={formatDate(formData.date_of_call)} onChange={e => setFormData({...formData, date_of_call: e.target.value})} />
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Outcome / Status</label>
                    <Select value={currentOutcome} onValueChange={val => setFormData({...formData, outcome: val})}>
                      <SelectTrigger className="h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                      <SelectContent>
                        {existingOutcomes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        {currentOutcome && !existingOutcomes.includes(currentOutcome) && (
                          <SelectItem value={currentOutcome}>{currentOutcome}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Row 4: Phone Number, Call Length */}
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Phone Number</label>
                    <div className="flex gap-2">
                      <Input 
                        value={formData.phone_number?.replace(/ \((Personal|Office)\)$/, '') || ''} 
                        onChange={e => {
                          const type = formData.phone_number?.match(/ \((Personal|Office)\)$/)?.[1] || 'Personal';
                          setFormData({...formData, phone_number: e.target.value ? `${e.target.value} (${type})` : ''})
                        }}
                        placeholder="e.g. 555-123-4567"
                        className="flex-1 h-8.5 sm:h-9 text-xs sm:text-sm"
                      />
                      <Select 
                        value={formData.phone_number?.match(/ \((Personal|Office)\)$/)?.[1] || 'Personal'} 
                        onValueChange={val => {
                          const num = formData.phone_number?.replace(/ \((Personal|Office)\)$/, '') || '';
                          setFormData({...formData, phone_number: num ? `${num} (${val})` : ` (${val})`})
                        }}
                      >
                        <SelectTrigger className="w-[100px] sm:w-[120px] h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personal">Personal</SelectItem>
                          <SelectItem value="Office">Office</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Call Length</label>
                    <Input 
                      value={formData.call_length || ''} 
                      onChange={handleCallLengthChange}
                      placeholder="mm:ss"
                      className="h-8.5 sm:h-9 text-xs sm:text-sm font-mono"
                    />
                  </div>

                  {/* Row 5: Picked Up, KDM */}
                  
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Picked Up?</label>
                    <Select value={formatYesNo(formData.picked_up)} onValueChange={val => setFormData({...formData, picked_up: val})}>
                      <SelectTrigger className="h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">KDM?</label>
                    <Select value={formatYesNo(formData.kdm)} onValueChange={val => setFormData({...formData, kdm: val})}>
                      <SelectTrigger className="h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  </div>

                  <div className="space-y-1 text-left w-full">
                    <label className="font-medium text-xs sm:text-sm">Analyst</label>
                  <Select value={currentAnalyst || undefined} onValueChange={val => setFormData({...formData, analyst: val})}>
                    <SelectTrigger className="h-8.5 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select analyst..." /></SelectTrigger>
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
                    <label className="font-medium text-xs sm:text-sm">Notes</label>
                    <Textarea 
                      value={formData.notes || ''} 
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="sticky bottom-0 bg-card z-10 p-3 sm:p-4 border-t flex justify-end gap-2 rounded-b-lg shadow-xs shrink-0">
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            )}

            {!editingId && logs?.map(log => (
              <div key={log.id} className="bg-card border p-3 sm:p-4 rounded-lg shadow-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">{formatDate(log.date_of_call) || 'No Date'}{log.call_length ? ` • ${log.call_length}` : ''}</span>
                    <h4 className="font-semibold text-sm sm:text-base text-foreground">{log.outcome || 'No Outcome specified'}</h4>
                  </div>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEdit(log)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeletingId(log.id)}>Delete</Button>
                  </div>
                </div>
                
                <div className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap mt-1">
                  {log.notes}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-3 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md">
                  <div>Contact: <span className="text-foreground font-medium">{log.contact_name || '-'}</span></div>
                  <div>Phone: <span className="text-foreground font-medium">{formatPhoneNumber(log.phone_number) || '-'}</span></div>
                  <div>KDM: <span className="text-foreground font-medium">{formatYesNo(log.kdm)}</span> | Picked up: <span className="text-foreground font-medium">{formatYesNo(log.picked_up)}</span></div>
                  <div>Analyst: <span className="text-foreground font-medium">{getAnalystName(log.analyst)}</span></div>
                </div>
              </div>
            ))}
            
            {logs?.length === 0 && !editingId && (
              <div className="text-center text-muted-foreground p-8 border border-dashed rounded-lg text-xs sm:text-sm">
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


