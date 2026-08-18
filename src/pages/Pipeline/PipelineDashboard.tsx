import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { Download } from "lucide-react";
import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Upload, CalendarClock, User, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { 
  usePipelineTasks, 
  usePriorities, 
  type PipelineTask, 
  useImportPipeline, 
  useDeleteTask, 
  useAnalysts, 
  useCreateCompany, 
  useCountries, 
  useStates 
} from "@/hooks/usePipeline";
import { AutocompleteCombobox } from "@/components/ui/autocomplete-combobox";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Link, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();

  // Add Company Modal state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newCompanyPhone, setNewCompanyPhone] = useState("");
  const [newCompanyStateCode, setNewCompanyStateCode] = useState<string>("");
  const [newCompanyCountryCode, setNewCompanyCountryCode] = useState<string>("");

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();
  const { isLoading: prioritiesLoading } = usePriorities();
  const { data: analystOptions } = useAnalysts();

  const { data: countries } = useCountries();
  const { data: states } = useStates(newCompanyCountryCode || undefined);
  const { mutate: createCompany, isPending: isCreatingCompany } = useCreateCompany();

  const handleCreateCompany = () => {
    if (!newCompanyName.trim()) return;

    createCompany({
      name: newCompanyName.trim(),
      phone: newCompanyPhone.trim() || null,
      state_code: newCompanyStateCode || null,
      country_code: newCompanyCountryCode || null,
      contact_name: newContactName.trim() || null,
      email: newCompanyEmail.trim() || null,
    }, {
      onSuccess: () => {
        toast.success("Company created successfully");
        setIsCompanyModalOpen(false);
        setNewCompanyName("");
        setNewContactName("");
        setNewCompanyEmail("");
        setNewCompanyPhone("");
        setNewCompanyStateCode("");
        setNewCompanyCountryCode("");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.detail || "Failed to create company");
      }
    });
  };

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

  useEffect(() => {
    const taskId = searchParams.get('taskId');
    if (taskId && tasks && !selectedTask) {
      const task = tasks.find(t => t.id === parseInt(taskId));
      if (task) {
        setSelectedTask(task);
        searchParams.delete('taskId');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, tasks, selectedTask]);

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


  const handleExportTasks = () => {
    try {
      const dataToExport = tasks || [];
      const cols: ExportColumn<PipelineTask>[] = [
        { header: "Company Name", accessor: (r) => r.company_name || "" },
        { header: "Priority", accessor: (r) => r.priority_name || "" },
        { header: "Outcome", accessor: (r) => r.outcome_name || "" },
        { header: "Latest Note", accessor: (r) => r.latest_note || "" },
        { header: "State/Province", accessor: (r) => r.state_name || r.state_code || "" },
        { header: "Country", accessor: (r) => r.country_name || r.country_code || "" },
        { header: "Assigned Analyst", accessor: (r) => r.analyst_name || "" },
        { header: "Revenue", accessor: (r) => r.revenue || "" },
        { header: "Team Size", accessor: (r) => r.team_size || "" },
        { header: "Follow-up Date", accessor: (r) => r.follow_up_date || "" },
        { header: "NDA", accessor: (r) => r.nda || "" },
        { header: "P&L", accessor: (r) => r.p_and_l || "" },
        { header: "Industry", accessor: (r) => r.industry_name || "" },
        { header: "Contact Name", accessor: (r) => r.name || "" },
        { header: "Email", accessor: (r) => r.email || "" },
        { header: "Phone", accessor: (r) => r.phone || "" },
        { header: "1st POC", accessor: (r) => r.first_poc || "" },
        { header: "No. of Calls", accessor: (r) => r.no_of_calls || "" },
      ];
      exportToCsv(dataToExport, cols, "pipeline_tasks");
      toast.success("Tasks exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export tasks");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
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

          <Button 
            variant="outline" 
            onClick={() => setIsCompanyModalOpen(true)} 
            className="gap-2 h-9"
          >
            <Building2 className="h-4 w-4 text-primary" />
            <span>Add Company</span>
          </Button>

          <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
          <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleExportTasks}>
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>

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

      {/* Add Company Dialog */}
      <Dialog open={isCompanyModalOpen} onOpenChange={setIsCompanyModalOpen}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Add Company
            </DialogTitle>
            <DialogDescription>Create a new company record.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name <span className="text-red-500">*</span></label>
              <Input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Name</label>
              <Input
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Primary contact name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={newCompanyEmail}
                  onChange={(e) => setNewCompanyEmail(e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newCompanyPhone}
                  onChange={(e) => setNewCompanyPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2 min-w-0">
                <label className="text-sm font-medium">State/Province</label>
                <AutocompleteCombobox
                  value={newCompanyStateCode}
                  onChange={(v) => setNewCompanyStateCode(v?.toString() || "")}
                  options={(states || []).map(s => ({ id: s.name, name: s.name }))}
                  placeholder="Select state/province..."
                  disabled={!newCompanyCountryCode}
                />
              </div>

              <div className="grid gap-2 min-w-0">
                <label className="text-sm font-medium">Country</label>
                <AutocompleteCombobox
                  value={newCompanyCountryCode}
                  onChange={(v) => {
                    setNewCompanyCountryCode(v?.toString() || "");
                    setNewCompanyStateCode("");
                  }}
                  options={(countries || []).map(c => ({ id: c.name, name: c.name }))}
                  placeholder="Select country..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompanyModalOpen(false)} disabled={isCreatingCompany}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || isCreatingCompany}
            >
              {isCreatingCompany && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreatingCompany ? "Saving..." : "Save Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        confirmText="Import"
        loadingText="Importing..."
        variant="default"
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
