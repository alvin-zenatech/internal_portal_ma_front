import { useState, useMemo, useCallback } from "react";
import { usePipelineTasks, type PipelineTask } from "@/hooks/usePipeline";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { Loader2 } from "lucide-react";

const DEFAULT_SORT = [{ id: "revenue", desc: true }];

export default function WeeklyCheckIn() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    const allowedPriorities = ["high value", "good fit", "50/50"];

    // 1. Filter by specific priorities
    let result = tasks.filter(t => 
      t.priority_name && allowedPriorities.includes(t.priority_name.toLowerCase())
    );

    // 2. Sort by revenue (highest to lowest)
    result.sort((a, b) => {
      const parseRevenue = (rev: string | null) => {
        if (!rev) return 0;
        const normalized = rev.replace(/,/g, "");
        const matches = normalized.match(/\d+/g);
        if (!matches) return 0;
        return Math.max(...matches.map(m => parseInt(m, 10)));
      };

      const revA = parseRevenue(a.revenue);
      const revB = parseRevenue(b.revenue);

      return revB - revA; // Descending
    });

    return result;
  }, [tasks]);

  const handleEdit = useCallback((task: PipelineTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0 bg-background">
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b bg-card shrink-0">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
          Weekly Check-In
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Review high-priority tasks (High Value, Good Fit, 50/50) ordered by highest revenue.
        </p>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20 flex flex-col min-h-0">
        {tasksLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading check-in list...
          </div>
        ) : (
          <PipelineListView 
            tasks={filteredAndSortedTasks} 
            onTaskClick={setSelectedTask} 
            onEdit={handleEdit}
            defaultSorting={DEFAULT_SORT}
          />
        )}
      </div>

      <TaskFormModal 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        task={editingTask} 
      />

      <TaskDetailPanel 
        task={selectedTaskData} 
        onClose={() => setSelectedTask(null)} 
        onEdit={handleEdit}
      />
    </div>
  );
}
