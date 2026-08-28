import { useState, useMemo, useCallback, useEffect } from "react";
import { usePipelineTasks, useAnalysts, type PipelineTask } from "@/hooks/usePipeline";
import { useExecutionAnalystOptions } from "@/hooks/useExecutionAnalyst";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import PipelineListView from "./PipelineListView";
import TaskFormModal from "./TaskFormModal";
import TaskDetailPanel from "./TaskDetailPanel";
import { Loader2, Maximize2, Minimize2, User, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const DEFAULT_SORT = [{ id: "revenue", desc: true }];

export default function WeeklyCheckIn() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const [executionAnalystFilter, setExecutionAnalystFilter] = useState<string>("all");
  const { data: analystOptions } = useAnalysts();
  const { options: executionAnalystOptions } = useExecutionAnalystOptions();
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PipelineTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<PipelineTask | null>(null);

  const { data: tasks, isLoading: tasksLoading } = usePipelineTasks();

  const selectedTaskData = tasks?.find(t => t.id === selectedTask?.id) || selectedTask;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullScreen]);

  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let result = tasks;

    // Filter by analyst
    if (analystFilter !== "all") {
      if (analystFilter === "unassigned") {
        result = result.filter(t => !t.analyst_id);
      } else {
        result = result.filter(t => t.analyst_id === analystFilter);
      }
    }

    // Filter by execution analyst
    if (executionAnalystFilter !== "all") {
      if (executionAnalystFilter === "unassigned") {
        result = result.filter(t => !t.execution_analyst || !t.execution_analyst.trim());
      } else {
        result = result.filter(t => (t.execution_analyst || "").toUpperCase().trim() === executionAnalystFilter.toUpperCase().trim());
      }
    }

    const allowedPriorities = ["high value", "good fit", "50/50"];

    // Filter by specific priorities
    result = result.filter(t => 
      t.priority_name && allowedPriorities.includes(t.priority_name.toLowerCase())
    );

    // Sort by revenue (highest to lowest)
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
  }, [tasks, analystFilter, executionAnalystFilter]);

  const handleExportTasks = () => {
    try {
      const dataToExport = filteredAndSortedTasks || [];
      const cols: ExportColumn<PipelineTask>[] = [
        { header: "Company Name", accessor: (r) => r.company_name || "" },
        { header: "Priority", accessor: (r) => r.priority_name || "" },
        { header: "Outcome", accessor: (r) => r.outcome_name || "" },
        { header: "Latest Note", accessor: (r) => r.latest_note || "" },
        { header: "State/Province", accessor: (r) => r.state_name || r.state_code || "" },
        { header: "Country", accessor: (r) => r.country_name || r.country_code || "" },
        { header: "Assigned Analyst", accessor: (r) => r.analyst_name || "" },
        { header: "Execution Analyst", accessor: (r) => r.execution_analyst || "" },
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
      exportToCsv(dataToExport, cols, "weekly_check_in_tasks");
      toast.success("Tasks exported successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to export tasks");
    }
  };

  const handleEdit = useCallback((task: PipelineTask) => {
    setEditingTask(task);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="h-full flex flex-col w-full animate-in fade-in duration-500 min-h-0 bg-background">
      {/* Normal Header */}
      <div className="px-3 sm:px-5 py-3 sm:py-4 border-b bg-card shrink-0 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Weekly Check-In
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Review high-priority tasks (High Value, Good Fit, 50/50) ordered by highest revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsFullScreen(true)} 
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Full Screen View</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Filter & Action Controls Bar */}
      <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 border-b bg-card flex justify-between items-center shrink-0 flex-wrap gap-2.5 sm:gap-3">
        {/* Left Side: Filter Analysts, Search, and Export CSV */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <div className="flex items-center shrink-0">
            <Select value={analystFilter} onValueChange={setAnalystFilter}>
              <SelectTrigger className="w-[140px] sm:w-[160px] h-8.5 sm:h-9 bg-card text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground mr-1.5" />
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

          <div className="flex items-center shrink-0">
            <Select value={executionAnalystFilter} onValueChange={setExecutionAnalystFilter}>
              <SelectTrigger className="w-[155px] sm:w-[185px] h-8.5 sm:h-9 bg-card text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
                <SelectValue placeholder="All Execution Analysts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Execution Analysts</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {executionAnalystOptions.map(ea => (
                  <SelectItem key={ea.initials} value={ea.initials}>
                    {ea.name} ({ea.initials})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {executionAnalystFilter !== "all" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-xs rounded-full font-medium animate-in fade-in">
              <span>Execution: {executionAnalystOptions.find(o => o.initials.toUpperCase() === executionAnalystFilter.toUpperCase())?.name || executionAnalystFilter}</span>
              <button 
                type="button"
                onClick={() => setExecutionAnalystFilter("all")}
                className="hover:bg-primary/20 rounded-full p-0.5"
                aria-label="Clear Execution Analyst Filter"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="flex items-center shrink-0">
             <Input 
                placeholder="Search pipeline..." 
                value={globalFilter} 
                onChange={(event) => setGlobalFilter(event.target.value)} 
                className="w-44 sm:w-56 max-w-sm h-8.5 sm:h-9 text-xs sm:text-sm" 
              />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportTasks} 
            className="gap-1.5 h-8.5 sm:h-9 shrink-0 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Main Content / Full Screen View */}
      {isFullScreen ? (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in fade-in duration-200">
          {/* Full Screen Header */}
          <div className="px-6 py-2.5 border-b bg-card flex justify-between items-center shrink-0 flex-wrap gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 mr-2">
                <span className="font-semibold text-sm tracking-tight">Weekly Check-In</span>
              </div>

              <div className="flex items-center shrink-0">
                <Select value={analystFilter} onValueChange={setAnalystFilter}>
                  <SelectTrigger className="w-[160px] h-9 bg-white dark:bg-card">
                    <User className="h-4 w-4 text-muted-foreground mr-1.5" />
                    <SelectValue placeholder="All Analysts" />
                  </SelectTrigger>
                  <SelectContent className="z-[1000]">
                    <SelectItem value="all">All Analysts</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(analystOptions ?? []).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center shrink-0">
                <Select value={executionAnalystFilter} onValueChange={setExecutionAnalystFilter}>
                  <SelectTrigger className="w-[185px] h-9 bg-white dark:bg-card">
                    <User className="h-4 w-4 text-blue-500 mr-1.5" />
                    <SelectValue placeholder="All Execution Analysts" />
                  </SelectTrigger>
                  <SelectContent className="z-[1000]">
                    <SelectItem value="all">All Execution Analysts</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {executionAnalystOptions.map(ea => (
                      <SelectItem key={ea.initials} value={ea.initials}>
                        {ea.name} ({ea.initials})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {executionAnalystFilter !== "all" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-xs rounded-full font-medium animate-in fade-in">
                  <span>Execution: {executionAnalystOptions.find(o => o.initials.toUpperCase() === executionAnalystFilter.toUpperCase())?.name || executionAnalystFilter}</span>
                  <button 
                    type="button"
                    onClick={() => setExecutionAnalystFilter("all")}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Clear Execution Analyst Filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center shrink-0">
                <Input 
                  placeholder="Search pipeline..." 
                  value={globalFilter} 
                  onChange={(event) => setGlobalFilter(event.target.value)} 
                  className="w-56 max-w-sm h-9" 
                />
              </div>

              <Button 
                variant="outline" 
                onClick={handleExportTasks} 
                className="gap-1.5 h-9 shrink-0"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Export CSV</span>
              </Button>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap ml-auto">
              <Button 
                variant="secondary" 
                onClick={() => setIsFullScreen(false)} 
                className="gap-1.5 h-9 font-medium"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Exit Full Screen</span>
              </Button>
            </div>
          </div>

          {/* Full Screen Table Container */}
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
                globalFilter={globalFilter}
                onGlobalFilterChange={setGlobalFilter}
                hideSearchBar={true}
                defaultSorting={DEFAULT_SORT}
              />
            )}
          </div>
        </div>
      ) : (
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
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              hideSearchBar={true}
              defaultSorting={DEFAULT_SORT}
            />
          )}
        </div>
      )}

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

