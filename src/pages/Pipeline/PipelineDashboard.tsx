import { useState, useRef, useMemo, useEffect, useDeferredValue, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Search, Plus, Loader2, Upload, Minimize2, Maximize2, X, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PipelineKanbanView from "./PipelineKanbanView";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { usePipelineTasks, usePriorities, type PipelineTask, useImportPipeline, useDeleteTask, useUsers } from "@/hooks/usePipeline";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link } from "react-router-dom";
import { addDays, isBefore, isValid, parseISO, startOfDay } from "date-fns";

export default function PipelineDashboard() {
  const [view, setView] = useState<"kanban" | "list">("list");
  const [isCompact, setIsCompact] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem("pipelineKanbanZoom");
    return saved ? parseFloat(saved) : 0.75;
  });

  useEffect(() => {
    localStorage.setItem("pipelineKanbanZoom", zoomLevel.toString());
  }, [zoomLevel]);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities();
  const { data: users } = useUsers();

  /** Super admins are never selectable as analysts. */
  const analystOptions = useMemo(() => (users ?? []).filter(u => !u.is_super_admin), [users]);

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

    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      result = result.filter(t => 
        (t.company_name?.toLowerCase().includes(query)) ||
        (t.name?.toLowerCase().includes(query)) ||
        (t.email?.toLowerCase().includes(query)) ||
        (t.phone?.toLowerCase().includes(query)) ||
        (t.location?.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [tasks, deferredSearchQuery, analystFilter]);

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
          {view === "kanban" && (
            <>
              <div className="hidden sm:block">
                <Select value={analystFilter} onValueChange={setAnalystFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All Analysts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Analysts</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {analystOptions.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              {(searchQuery || analystFilter !== 'all') && (
                <div className="flex items-center gap-2 hidden lg:flex">
                  {searchQuery && (
                    <Badge variant="secondary" className="h-6 font-normal">
                      Search: {searchQuery}
                    </Badge>
                  )}
                  {analystFilter !== 'all' && (
                    <Badge variant="secondary" className="h-6 font-normal">
                      Analyst: {analystFilter === 'unassigned' ? 'Unassigned' : analystOptions.find(u => u.id === analystFilter)?.full_name || 'Selected'}
                    </Badge>
                  )}
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setAnalystFilter("all");
                    }}
                    className="h-8 px-2 lg:px-3 text-muted-foreground hover:text-foreground"
                  >
                    Reset Filters
                    <X className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="h-8 border-l hidden sm:block"></div>

          <TooltipProvider delayDuration={300}>
            <Tabs value={view} onValueChange={(v) => setView(v as "kanban" | "list")} className="w-auto">
              <TabsList>
                <TabsTrigger value="kanban" className="px-3" title="Board View"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="list" className="px-3" title="List View"><List className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>

          {view === "kanban" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setIsCompact(!isCompact)} 
                  >
                    {isCompact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isCompact ? "Expand view" : "Compact view"}</TooltipContent>
              </Tooltip>
              
              <Select value={zoomLevel.toString()} onValueChange={(val) => setZoomLevel(parseFloat(val))}>
                <SelectTrigger className="h-9 w-24">
                  <SelectValue placeholder="Zoom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50%</SelectItem>
                  <SelectItem value="0.75">75%</SelectItem>
                  <SelectItem value="0.9">90%</SelectItem>
                  <SelectItem value="1">100%</SelectItem>
                  <SelectItem value="1.1">110%</SelectItem>
                  <SelectItem value="1.25">125%</SelectItem>
                  <SelectItem value="1.5">150%</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          <div className="h-8 w-px bg-border mx-1 hidden md:block" />
          
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
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import XLSX</TooltipContent>
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
          <>
            {view === "kanban" ? (
              <PipelineKanbanView 
                tasks={filteredTasks} 
                priorities={priorities || []} 
                onTaskClick={setSelectedTask} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCreate={handleCreate}
                isCompact={isCompact}
                zoomLevel={zoomLevel}
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
