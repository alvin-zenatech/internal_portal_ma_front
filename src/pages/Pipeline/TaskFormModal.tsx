import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCreateTask, useUpdateTask, type PipelineTask, useIndustries, usePositions, usePriorities, useCountries, useUsers } from "@/hooks/usePipeline";

export default function TaskFormModal({ open, onOpenChange, task }: { open: boolean, onOpenChange: (o: boolean) => void, task: PipelineTask | null }) {
  const { data: industries } = useIndustries();
  const { data: positions } = usePositions();
  const { data: priorities } = usePriorities();
  const { data: countries } = useCountries();
  const { data: users } = useUsers();

  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: updateTask } = useUpdateTask();

  const [formData, setFormData] = useState<any>({
    company_name: "", name: "", email: "", priority_id: "", industry_id: "", position_id: "", 
    country_id: "", location: "", phone: "", first_poc: "", nda: "", p_and_l: "", 
    revenue: "", team_size: "", no_of_calls: "", notes: "", analyst_id: "unassigned"
  });

  useEffect(() => {
    if (task) {
      setFormData({
        company_name: task.company_name, name: task.name, email: task.email, 
        priority_id: task.priority_id?.toString() || "", industry_id: task.industry_id?.toString() || "", 
        position_id: task.position_id?.toString() || "", country_id: task.country_id?.toString() || "",
        location: task.location || "", phone: task.phone || "", first_poc: task.first_poc || "", 
        nda: task.nda || "", p_and_l: task.p_and_l || "", revenue: task.revenue || "", 
        team_size: task.team_size || "", no_of_calls: task.no_of_calls || "", notes: "",
        analyst_id: task.analyst_id || "unassigned"
      });
    } else {
      setFormData({
        company_name: "", name: "", email: "", priority_id: priorities?.find(p => p.name.toLowerCase() === "new")?.id?.toString() || priorities?.[0]?.id?.toString() || "", 
        industry_id: "", position_id: "", country_id: "", location: "", phone: "", first_poc: "", 
        nda: "", p_and_l: "", revenue: "", team_size: "", no_of_calls: "", notes: "", analyst_id: "unassigned"
      });
    }
  }, [task, open, priorities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        priority_id: parseInt(formData.priority_id),
        industry_id: formData.industry_id ? parseInt(formData.industry_id) : undefined,
        position_id: formData.position_id ? parseInt(formData.position_id) : undefined,
        country_id: formData.country_id ? parseInt(formData.country_id) : undefined,
        analyst_id: formData.analyst_id === "unassigned" ? null : formData.analyst_id,
      };

      if (task) {
        // Remove notes from payload for updates, as they are handled separately
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
      <DialogContent className="sm:max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>Fill out the task details below.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input required value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Priority (Status) *</Label>
              <Select value={formData.priority_id} onValueChange={v => setFormData({...formData, priority_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  {priorities?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Analyst</Label>
              <Select value={formData.analyst_id} onValueChange={v => setFormData({...formData, analyst_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select analyst" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Industry</Label>
              <Select value={formData.industry_id} onValueChange={v => setFormData({...formData, industry_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {industries?.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={formData.position_id} onValueChange={v => setFormData({...formData, position_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {positions?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={formData.country_id} onValueChange={v => setFormData({...formData, country_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {countries?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location / City</Label>
              <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Revenue</Label>
              <Input value={formData.revenue} onChange={e => setFormData({...formData, revenue: e.target.value})} />
            </div>
          </div>

          {!task && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Initial Note</Label>
              <Input placeholder="Optional starting note..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
