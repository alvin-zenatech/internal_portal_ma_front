import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List, Upload, Loader2 } from "lucide-react";
import PipelineKanbanView from "./PipelineKanbanView";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { usePipelineTasks, usePriorities, type PipelineTask, useImportPipeline, useDeleteTask } from "@/hooks/usePipeline";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function PipelineDashboard() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities();

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: importPipeline, isPending } = useImportPipeline();
  const { mutateAsync: deleteTask } = useDeleteTask();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPipeline(file, {
        onSuccess: (res) => toast.success(res.message || "Imported successfully"),
        onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to import"),
        onSettled: () => {
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      });
    }
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
    <div className="h-[calc(100vh-5rem)] flex flex-col w-full animate-in fade-in duration-500">
      <div className="px-8 py-6 border-b bg-card flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage and track your pipeline tasks.</p>
        </div>
        <div className="flex items-center gap-4">
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

          <Button onClick={handleCreate} className="gap-2">
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
                tasks={tasks || []} 
                priorities={priorities || []} 
                onTaskClick={setSelectedTask} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreate={handleCreate}
              />
            ) : (
              <PipelineListView 
                tasks={tasks || []} 
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
    </div>
  );
}
