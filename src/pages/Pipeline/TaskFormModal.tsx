import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { CalendarIcon, X, Loader2 } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useCreateTask, 
  useUpdateTask, 
  type PipelineTask, 
  useIndustries, 
  usePriorities, 
  useCountries, 
  useAnalysts, 
  useStates, 
  useCreateIndustry, 
  useCompanies,
  useCreateCompany,
} from "@/hooks/usePipeline";
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import ExecutionAnalystSelect from "@/components/Pipeline/ExecutionAnalystSelect";

export default function TaskFormModal({ open, onOpenChange, task }: { open: boolean, onOpenChange: (o: boolean) => void, task: PipelineTask | null }) {
  const { data: industries } = useIndustries();
  const { mutateAsync: createIndustry } = useCreateIndustry();
  const { data: companies } = useCompanies();
  const { mutateAsync: createCompany } = useCreateCompany();

  const companyOptions = useMemo(() => {
    return (companies || []).map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      contact_name: c.contact_name || "",
      country_code: c.country_name || c.country_code || "",
      state_code: c.state_name || c.state_code || ""
    }));
  }, [companies]);

  const { data: priorities } = usePriorities();
  const { data: countries } = useCountries();
  
  const [formData, setFormData] = useState<any>({
    company_name: "", name: "", email: "", priority_id: "", industry_id: "",
    country_code: "", state_code: "", phone: "", nda: "", p_and_l: "",
    revenue: "", team_size: "", notes: "", analyst_id: "unassigned", execution_analyst: "", follow_up_date: ""
  });

  const { data: states } = useStates(formData.country_code || undefined);
  const { data: analysts } = useAnalysts();

  const { mutateAsync: createTask, isPending: isCreating } = useCreateTask();
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (task) {
      setFormData({
        company_name: task.company_name, name: task.name, email: task.email, 
        priority_id: task.priority_id?.toString() || "", industry_id: task.industry_id?.toString() || "", 
        country_code: task.country_name || task.country_code || "",
        state_code: task.state_name || task.state_code || "", phone: task.phone || "",
        nda: task.nda || "", p_and_l: task.p_and_l || "", revenue: task.revenue || "", 
        team_size: task.team_size || "", notes: "",
        analyst_id: task.analyst_id || "unassigned",
        execution_analyst: task.execution_analyst || "",
        follow_up_date: task.follow_up_date || ""
      });
    } else {
      setFormData({
        company_name: "", name: "", email: "", priority_id: priorities?.find(p => p.name.toLowerCase() === "new")?.id?.toString() || priorities?.[0]?.id?.toString() || "", 
        industry_id: "", country_code: "", state_code: "", phone: "", 
        nda: "", p_and_l: "", revenue: "", team_size: "", notes: "", analyst_id: "unassigned", execution_analyst: "", follow_up_date: ""
      });
    }
  }, [task, open, priorities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (
        !formData.company_name || !formData.name || !formData.email || 
        !formData.phone?.replace(/ \((Personal|Office)\)$/, '').trim() || 
        !formData.priority_id || !formData.analyst_id || !formData.industry_id || 
        !formData.country_code || !formData.state_code || 
        (!task && !formData.notes)
      ) {
        toast.error("Please fill out all required fields.");
        return;
      }

      const payload = {
        ...formData,
        priority_id: parseInt(formData.priority_id),
        industry_id: formData.industry_id ? parseInt(formData.industry_id) : undefined,
        country_code: formData.country_code || null,
        state_code: formData.state_code || null,
        analyst_id: formData.analyst_id === "unassigned" ? null : formData.analyst_id,
        execution_analyst: formData.execution_analyst?.trim() || null,
        follow_up_date: formData.follow_up_date || null,
      };

      if (task) {
        const { notes, ...updatePayload } = payload;
        await updateTask({ id: task.id, data: updatePayload });
        toast.success("Task updated");
      } else {
        await createTask(payload);
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="sm:max-w-4xl w-[90vw] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-white z-10">
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>Fill out the task details below.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Company Name *</Label>
                <AutocompleteInput
                  value={formData.company_name || ""}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, company_name: val }))}
                  onSelectOption={(matchingCompany) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      company_name: matchingCompany.name,
                      phone: prev.phone || matchingCompany.phone || "",
                      email: prev.email || matchingCompany.email || "",
                      name: prev.name || matchingCompany.contact_name || "",
                      country_code: prev.country_code || matchingCompany.country_code || "",
                      state_code: prev.state_code || matchingCompany.state_code || "",
                    }));
                  }}
                  onCreate={async (name) => {
                    try {
                      const res = await createCompany({
                        name,
                        contact_name: formData.name?.trim() || undefined,
                        email: formData.email?.trim() || undefined,
                        phone: formData.phone?.replace(/ \((Personal|Office)\)$/, '').trim() || undefined,
                        location: [formData.state_code, formData.country_code].filter(Boolean).join(", ") || undefined,
                        state_name: formData.state_code?.trim() || undefined,
                        country_code: formData.country_code?.trim() || undefined,
                      });
                      toast.success(`Company "${name}" created`);
                      return (res as any)?.name || name;
                    } catch (e: any) {
                      toast.error(e?.response?.data?.detail || "Failed to create company");
                      return name;
                    }
                  }}
                  options={companyOptions}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Contact Name *</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div className="space-y-2 min-w-0">
                <Label>Email *</Label>
                <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Phone *</Label>
                <div className="flex gap-2">
                  <Input 
                    required 
                    value={formData.phone?.replace(/ \((Personal|Office)\)$/, '') || ''} 
                    onChange={e => {
                      const type = formData.phone?.match(/ \((Personal|Office)\)$/)?.[1] || 'Personal';
                      setFormData({...formData, phone: `${e.target.value} (${type})`})
                    }}
                    className="flex-1"
                  />
                  <Select 
                    value={formData.phone?.match(/ \((Personal|Office)\)$/)?.[1] || 'Personal'} 
                    onValueChange={val => {
                      const num = formData.phone?.replace(/ \((Personal|Office)\)$/, '') || '';
                      setFormData({...formData, phone: num ? `${num} (${val})` : ` (${val})`})
                    }}
                  >
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Priority *</Label>
                <Select required value={formData.priority_id} onValueChange={v => setFormData({...formData, priority_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorities?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Industry *</Label>
                <AutocompleteCombobox
                  value={parseInt(formData.industry_id) || ""}
                  onChange={v => setFormData({...formData, industry_id: v?.toString() || ""})}
                  options={(industries || []).map(i => ({ id: i.id, name: i.name }))}
                  onCreate={async (name) => {
                    const res = await createIndustry({ name }) as any;
                    return res?.id || res;
                  }}
                  placeholder="Select industry..."
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Assigned Analyst *</Label>
                <Select required value={formData.analyst_id} onValueChange={v => setFormData({...formData, analyst_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select analyst" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {analysts?.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Execution Analysts</Label>
                <ExecutionAnalystSelect
                  value={formData.execution_analyst}
                  onChange={(val) => setFormData({ ...formData, execution_analyst: val })}
                  placeholder="Select execution analyst..."
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Province *</Label>
                <AutocompleteCombobox
                  value={formData.state_code || ""}
                  onChange={v => setFormData({...formData, state_code: v?.toString() || ""})}
                  options={(states || []).map(s => ({ id: s.name, name: s.name }))}
                  placeholder="Select province..."
                  disabled={!formData.country_code}
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Country *</Label>
                <AutocompleteCombobox
                  value={formData.country_code || ""}
                  onChange={v => setFormData({...formData, country_code: v?.toString() || "", state_code: ""})}
                  options={(countries || []).map(c => ({ id: c.name, name: c.name }))}
                  placeholder="Select country..."
                />
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Follow-up Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.follow_up_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.follow_up_date ? (
                        format(parse(formData.follow_up_date, "yyyy-MM-dd", new Date()), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      {formData.follow_up_date && (
                        <X
                          className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({ ...formData, follow_up_date: "" });
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.follow_up_date ? parse(formData.follow_up_date, "yyyy-MM-dd", new Date()) : undefined}
                      onSelect={(date) => {
                        setFormData({
                          ...formData,
                          follow_up_date: date ? format(date, "yyyy-MM-dd") : "",
                        });
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>NDA Status</Label>
                <Select value={formData.nda || "none"} onValueChange={v => setFormData({...formData, nda: v === "none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="Select NDA status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Signed">Signed</SelectItem>
                    <SelectItem value="Not Signed">Not Signed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>P&L Status</Label>
                <Select value={formData.p_and_l || "none"} onValueChange={v => setFormData({...formData, p_and_l: v === "none" ? "" : v})}>
                  <SelectTrigger><SelectValue placeholder="Select P&L status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Received">Received</SelectItem>
                    <SelectItem value="Requested">Requested</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Revenue</Label>
                <Input placeholder="Revenue" value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Team Size</Label>
                <Input placeholder="Team Size" value={formData.team_size} onChange={e => setFormData({...formData, team_size: e.target.value})} />
              </div>
            </div>

            {!task && (
              <div className="space-y-2">
                <Label>Initial Notes *</Label>
                <Input required placeholder="Initial notes for the task..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {task ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
