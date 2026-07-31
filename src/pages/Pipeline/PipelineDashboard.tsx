import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List, Upload, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import PipelineKanbanView from "./PipelineKanbanView";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { usePipelineTasks, usePriorities, type PipelineTask, useImportPipeline, useDeleteTask } from "@/hooks/usePipeline";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function PipelineDashboard() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities();

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase();
    return tasks.filter(t => 
      (t.company_name?.toLowerCase().includes(query)) ||
      (t.name?.toLowerCase().includes(query)) ||
      (t.email?.toLowerCase().includes(query)) ||
      (t.phone?.toLowerCase().includes(query)) ||
      (t.location?.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: importPipeline, isPending } = useImportPipeline();
  const { mutateAsync: deleteTask } = useDeleteTask();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
    // reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const handleEdit = (task: PipelineTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCreate = (priorityId?: number) => {
    setEditingTask(priorityId ? { priority_id: priorityId } as unknown as PipelineTask : null);
    setIsFormOpen(true);
  };

  const handleDelete = (taskId: number) => {
    setTaskToDelete(taskId);
  };

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0">
      <div className="px-8 py-6 border-b bg-card flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage and track your pipeline tasks.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")} className="w-auto">
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2"><LayoutGrid className="h-4 w-4" /> Board</TabsTrigger>
              <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> List</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import XLSX
          </Button>

          <Button onClick={() => handleCreate()} className="gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative bg-muted/20">
        {tasksLoading || prioritiesLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading pipeline...</div>
        ) : (
          <>
            {view === "kanban" ? (
              <PipelineKanbanView 
                tasks={filteredTasks} 
                priorities={priorities || []} 
                onTaskClick={setSelectedTask} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            ) : (
              <PipelineListView 
                tasks={filteredTasks} 
                onTaskClick={setSelectedTask} 
                onEdit={handleEdit}
              />
            )}
          </>
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
            const toastId = toast.loading("Importing tasks from spreadsheet...");
            importPipeline(importFile, {
              onSuccess: (res: any) => {
                toast.success(res.message || "Imported successfully!", { id: toastId });
                setImportFile(null);
              },
              onError: (err: any) => {
                toast.error(err.response?.data?.detail || "Failed to import", { id: toastId });
                setImportFile(null);
              }
            });
          }
        }}
      />
    </div>
  );
}
