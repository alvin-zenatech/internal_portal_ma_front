import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useUpdateTask, useCreateTaskNote, type PipelineTask } from "@/hooks/usePipeline";

export function FollowUpActions({ task }: { task: PipelineTask }) {
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutateAsync: createNote, isPending: isNoting } = useCreateTaskNote();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [completeNote, setCompleteNote] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleReschedule = async () => {
    if (!date) return;
    await updateTask({ 
      id: task.id, 
      data: { follow_up_date: format(date, "yyyy-MM-dd") } 
    });
    setIsRescheduleOpen(false);
  };

  const handleComplete = async () => {
    if (completeNote.trim()) {
      await createNote({ taskId: task.id, note: completeNote, title: "Follow-up Completed" });
    }
    await updateTask({
      id: task.id,
      data: { follow_up_date: null }
    });
    setIsCompleteOpen(false);
    setCompleteNote("");
  };

  if (!task.follow_up_date) return null;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs font-medium bg-background hover:bg-muted/50 border-input shadow-sm">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            Reschedule
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b bg-muted/20">
            <h4 className="font-semibold text-sm">Reschedule Follow-up</h4>
            <p className="text-xs text-muted-foreground">Select a new date for {task.company_name}</p>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
          />
          <div className="p-3 border-t flex justify-end gap-2 bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReschedule} disabled={!date || isUpdating}>Confirm</Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsCompleteOpen(true)}
        className="gap-2 h-8 text-xs font-medium bg-background hover:bg-green-50 hover:text-green-700 hover:border-green-200 border-input shadow-sm transition-colors"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        Complete
      </Button>

      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Marking this follow-up as complete will remove its scheduled date. Add any final notes below (optional).
              </p>
              <Textarea
                placeholder="Enter completion notes..."
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                rows={4}
                className="resize-none focus-visible:ring-green-500 break-words"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCompleteOpen(false)} disabled={isUpdating || isNoting}>Cancel</Button>
            <Button onClick={handleComplete} disabled={isUpdating || isNoting} className="bg-green-600 hover:bg-green-700 text-white">
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
