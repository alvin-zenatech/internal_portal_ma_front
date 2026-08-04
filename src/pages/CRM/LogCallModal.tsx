import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateActivity } from "@/hooks/usePipeline";
import { format } from "date-fns";

export default function LogCallModal({ open, onOpenChange, taskId, defaultContactName, defaultPosition, defaultPhone }: { open: boolean, onOpenChange: (o: boolean) => void, taskId: number, defaultContactName?: string, defaultPosition?: string, defaultPhone?: string }) {
  const { mutateAsync: createActivity } = useCreateActivity();

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    contact_name: defaultContactName || "",
    position: defaultPosition || "",
    phone_number: defaultPhone || "",
    picked_up: "yes",
    emailed: "no",
    duration: "",
    outcome: "",
    notes: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.outcome) {
      toast.error("Please select an outcome");
      return;
    }

    try {
      await createActivity({
        taskId,
        data: {
          type: "Call",
          activity_date: new Date(formData.date).toISOString(),
          contact_name: formData.contact_name,
          position: formData.position,
          phone_number: formData.phone_number,
          picked_up: formData.picked_up === "yes",
          emailed: formData.emailed === "yes",
          duration: formData.duration,
          outcome: formData.outcome,
          notes: formData.notes
        }
      });
      toast.success("Call logged successfully");
      onOpenChange(false);
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        picked_up: "yes",
        emailed: "no",
        duration: "",
        outcome: "",
        notes: ""
      }));
    } catch (error) {
      toast.error("Failed to log call");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log New Call</DialogTitle>
          <DialogDescription>Record the details of your phone call with this company.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Contact Name</Label>
              <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
            </div>
            
            <div className="space-y-2">
              <Label>Position</Label>
              <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Picked Up?</Label>
              <Select value={formData.picked_up} onValueChange={v => setFormData({...formData, picked_up: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Call Duration (e.g. 4m 22s)</Label>
              <Input placeholder="0m 0s" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Emailed after call?</Label>
              <Select value={formData.emailed} onValueChange={v => setFormData({...formData, emailed: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Outcome *</Label>
              <Select value={formData.outcome} onValueChange={v => setFormData({...formData, outcome: v})}>
                <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No Answer">No Answer</SelectItem>
                  <SelectItem value="Left Voicemail">Left Voicemail</SelectItem>
                  <SelectItem value="Reception Only">Reception Only</SelectItem>
                  <SelectItem value="Callback Requested">Callback Requested</SelectItem>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Meeting Scheduled">Meeting Scheduled</SelectItem>
                  <SelectItem value="Not Interested">Not Interested</SelectItem>
                  <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                  <SelectItem value="Invalid Contact">Invalid Contact</SelectItem>
                  <SelectItem value="Existing Customer">Existing Customer</SelectItem>
                  <SelectItem value="Follow-up Required">Follow-up Required</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Notes</Label>
            <Textarea 
              className="min-h-[100px]" 
              placeholder="Detailed notes about the call..." 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
            />
          </div>

          <DialogFooter className="pt-4 border-t mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Save Call</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
