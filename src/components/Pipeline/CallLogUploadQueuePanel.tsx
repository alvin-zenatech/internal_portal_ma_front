import { FileText, Loader2, Play, Trash2, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useImportTasks, useDeleteImportTask, type ImportTaskItem, fetchPreviewCallLogResult, type CallLogPreviewRow } from "@/hooks/usePipeline";
import { exportToCsv, type ExportColumn } from "@/lib/exportUtils";
import { toast } from "sonner";

interface Props {
  onOpenPreview: (taskId: string) => void;
}

export default function CallLogUploadQueuePanel({ onOpenPreview }: Props) {
  const { data: tasks = [] } = useImportTasks();
  const deleteTask = useDeleteImportTask();

  if (!tasks || tasks.length === 0) return null;

  const handleExportJob = async (taskId: string, filename?: string) => {
    try {
      toast.loading("Fetching job data for export...", { id: `export-${taskId}` });
      const res = await fetchPreviewCallLogResult(taskId);
      toast.dismiss(`export-${taskId}`);
      if (!res.rows || res.rows.length === 0) {
        toast.error("No rows found in this job.");
        return;
      }
      const cols: ExportColumn<CallLogPreviewRow>[] = [
        { header: "Company Matching", accessor: (r) => r.company_name || r.raw_company_name || "" },
        { header: "File Company Name", accessor: (r) => r.raw_company_name || "" },
        { header: "Match Type", accessor: (r) => r.match_type },
        { header: "Industry", accessor: (r) => r.industry || r.raw_industry || "" },
        { header: "State/Province", accessor: (r) => r.state_province || r.raw_state_province || "" },
        { header: "Country", accessor: (r) => r.location || r.raw_location || "" },
        { header: "Contact", accessor: (r) => r.contact_name || r.raw_contact_name || "" },
        { header: "Position", accessor: (r) => r.position || r.raw_position || "" },
        { header: "Phone", accessor: (r) => r.phone_number || r.raw_phone_number || "" },
        { header: "Date", accessor: (r) => r.date_of_call || "" },
        { header: "KDM", accessor: (r) => r.kdm || r.raw_kdm || "" },
                { header: "Picked Up?", accessor: (r) => r.picked_up || "" },
        { header: "Outcome", accessor: (r) => r.outcome || "" },
        { header: "Length", accessor: (r) => r.call_length || "" },
        { header: "Analyst", accessor: (r) => r.analyst || "" },
        { header: "Notes", accessor: (r) => r.notes || "" },
        { header: "Duplicate Check", accessor: (r) => r.is_duplicate ? "Duplicate" : "Unique" },
      ];
      const prefix = filename ? filename.replace(/\.[^/.]+$/, "") : "job_export";
      exportToCsv(res.rows, cols, prefix);
      toast.success(`Exported ${res.rows.length} rows from job`);
    } catch (e: any) {
      toast.dismiss(`export-${taskId}`);
      toast.error(e?.message || "Failed to export job");
    }
  };

  const getStatusBadge = (task: ImportTaskItem) => {
    if (task.status === "completed") {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    }
    if (task.status === "failed") {
      return (
        <Badge variant="destructive" className="gap-1 text-[11px]">
          <AlertTriangle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 text-[11px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
        Processing ({task.progress}%)
      </Badge>
    );
  };

  return (
    <Card className="shrink-0 mb-3 border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs">
      <CardContent className="p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-foreground">
              Call Log Import Jobs
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {tasks.length} file{tasks.length === 1 ? "" : "s"} processed
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg shadow-xs transition-colors hover:border-blue-300 dark:hover:border-blue-800"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[260px] sm:max-w-sm md:max-w-md lg:max-w-lg" title={task.filename}>
                    {task.filename}
                  </span>
                  {getStatusBadge(task)}
                  {task.total_rows ? (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      ({task.total_rows.toLocaleString()} rows)
                    </span>
                  ) : null}
                </div>

                {task.status === "processing" ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{task.message || "Processing in background..."}</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{task.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {task.message || "Completed"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {task.status === "completed" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7.5 sm:h-8 text-xs px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleExportJob(task.task_id, task.filename)}
                      title="Export Job CSV"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Export</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7.5 sm:h-8 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
                      onClick={() => onOpenPreview(task.task_id)}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Open Preview</span>
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7.5 w-7.5 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteTask.mutate(task.task_id);
                  }}
                  title="Dismiss task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
