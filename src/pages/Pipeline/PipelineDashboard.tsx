import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Upload, X, CalendarClock, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { usePipelineTasks, usePriorities, type PipelineTask, useImportPipeline, useDeleteTask, useAnalysts } from "@/hooks/usePipeline";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link } from "react-router-dom";
import { addDays, isBefore, isValid, parseISO, startOfDay } from "date-fns";

const DEFAULT_SORT = [{ id: "priority_name", desc: false }];

export default function PipelineDashboard() {
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities();
  /** Selectable analysts. The endpoint already excludes super admins and, unlike the
   *  users endpoint, does not require the CONFIG_USERS_READ permission. */
  const { data: analystOptions } = useAnalysts();

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = tasks;
    if (analystFilter !== "all") {
      if (analystFilter === "unassigned") {
        result = result.filter(t => !t.analyst_id);
      } else {
        result = result.filter(t => t.analyst_id === analystFilter);
      }
    }

    const validStatuses = [
      "high value", "good fit", "50/50", 
      "loi-sent", "loi sent", 
      "loi-accepted", "loi sent - accepted", 
      "loi-declined", "loi sent - declined",
      "not a fit", "not ready to sell"
    ];
    result = result.filter(t => {
      const p = (t.priority_name || "").toLowerCase();
      return validStatuses.includes(p);
    });

    return result;
  }, [tasks, analystFilter]);

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  const dueFollowUpCount = useMemo(() => {
    if (!tasks) return 0;
    const tomorrow = startOfDay(addDays(new Date(), 1));
    return tasks.filter(task => {
      if (!task.follow_up_date) return false;
      const date = parseISO(task.follow_up_date);
      return isValid(date) && isBefore(date, tomorrow);
    }).length;
  }, [tasks]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingToastRef = useRef<string | number | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  
  const { mutate: importPipeline, isPending } = useImportPipeline((p, m) => {
    setImportProgress(p);
    setImportMessage(m);
  });
  
  useEffect(() => {
    if (loadingToastRef.current && isPending) {
      toast.loading(importMessage || "Importing tasks from spreadsheet...", { id: loadingToastRef.current });
    }
  }, [importMessage, isPending]);
  
  const { mutateAsync: deleteTask } = useDeleteTask();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
    // reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleEdit = useCallback((task: PipelineTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []);

  const handleCreate = useCallback((priorityId?: number) => {
    setEditingTask(priorityId ? { priority_id: priorityId } as unknown as PipelineTask : null);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback((taskId: number) => {
    setTaskToDelete(taskId);
  }, []);

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0">
      <div className="px-8 py-4 border-b bg-card flex justify-end items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Select value={analystFilter} onValueChange={setAnalystFilter}>
              <SelectTrigger className="w-[180px] h-9 bg-white">
                <User className="h-4 w-4 text-muted-foreground mr-2" />
                <SelectValue placeholder="All Analysts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Analysts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {(analystOptions ?? []).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center">
             <Input 
                placeholder="Search pipeline..." 
                value={globalFilter} 
                onChange={(event) => setGlobalFilter(event.target.value)} 
                className="w-64 max-w-sm h-9" 
              />
          </div>

          <TooltipProvider delayDuration={300}>
          
          <Button variant="outline" asChild className="hidden md:flex gap-2">
            <Link to="/pipeline/follow-ups">
              <CalendarClock className="h-4 w-4 text-blue-500" />
              Follow-ups
              {dueFollowUpCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {dueFollowUpCount}
                </span>
              )}
            </Link>
          </Button>

          <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size={isPending ? "default" : "icon"} onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-medium">{importProgress}%</span>
                  </div>
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPending ? importMessage || "Importing..." : "Import XLSX"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={() => handleCreate()}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Task</TooltipContent>
          </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20">
        {tasksLoading || prioritiesLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading pipeline...</div>
        ) : (
            <PipelineListView 
                tasks={filteredTasks} 
                onTaskClick={setSelectedTask} 
                onEdit={handleEdit}
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                hideSearchBar={true}
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

      <ConfirmDialog 
        open={taskToDelete !== null} 
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? All history and notes will be permanently lost."
        onConfirm={async () => {
          if (taskToDelete) {
            await deleteTask(taskToDelete);
            if (selectedTask?.id === taskToDelete) setSelectedTask(null);
            setTaskToDelete(null);
          }
        }}
      />

      <ConfirmDialog 
        open={importFile !== null} 
        onOpenChange={(open) => !open && setImportFile(null)}
        title="Confirm Import"
        description="Are you sure you want to import this spreadsheet? This action will permanently erase all current tasks, notes, and history on the pipeline board, and replace them entirely with the data from the imported spreadsheet."
        onConfirm={() => {
          if (importFile) {
            loadingToastRef.current = toast.loading("Importing tasks from spreadsheet...");
            importPipeline(importFile, {
              onSuccess: (res: any) => {
                toast.success(res.message || "Imported successfully!", { id: loadingToastRef.current! });
                loadingToastRef.current = null;
                setImportFile(null);
              },
              onError: (err: any) => {
                toast.error(err.message || err.response?.data?.detail || "Failed to import", { id: loadingToastRef.current! });
                loadingToastRef.current = null;
                setImportFile(null);
              }
            });
          }
        }}
      />
    </div>
  );
}


