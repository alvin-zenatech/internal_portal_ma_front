import { FileText, Loader2, Play, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useImportTasks, useDeleteImportTask, type ImportTaskItem } from "@/hooks/usePipeline";

interface Props {
  onOpenPreview: (taskId: string) => void;
}

export default function CallLogUploadQueuePanel({ onOpenPreview }: Props) {
  const { data: tasks = [] } = useImportTasks();
  const deleteTask = useDeleteImportTask();

  if (!tasks || tasks.length === 0) return null;

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
        <Loader2 className="h-3 w-3 animate-spin" />
        {task.progress}%
      </Badge>
    );
  };

  return (
    <Card className="mb-4 border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10 shadow-sm rounded-xl overflow-hidden">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-xs sm:text-sm text-foreground">
              Call Log Import Tasks & Previews ({tasks.length})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.task_id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg shadow-xs transition-colors hover:border-blue-300 dark:hover:border-blue-800"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[280px]">
                    {task.filename}
                  </span>
                  {getStatusBadge(task)}
                  {task.total_rows ? (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      ({task.total_rows} rows)
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
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
                    onClick={() => onOpenPreview(task.task_id)}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Open Preview
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteTask.mutate(task.task_id)}
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
