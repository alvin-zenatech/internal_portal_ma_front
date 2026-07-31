import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUpdateTask, useUsers, type PipelineTask } from "@/hooks/usePipeline";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, User, Edit, Trash2, UserPlus, CalendarClock } from "lucide-react";
import { 
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
  ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
  ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator
} from "@/components/ui/context-menu";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const getPriorityColors = (taskOrName: Partial<PipelineTask> | string) => {

  const color = typeof taskOrName === 'string' ? null : taskOrName?.priority_color;

  if (color && color.startsWith('#')) {
    return {
      borderStyle: { borderLeftColor: color },
      borderTopStyle: { borderTopColor: color },
      badgeStyle: { backgroundColor: `${color}20`, color: color },
    };
  }

  // fallback to slate if no color
  return {
    borderStyle: { borderLeftColor: '#94a3b8' },
    borderTopStyle: { borderTopColor: '#94a3b8' },
    badgeStyle: { backgroundColor: '#f1f5f9', color: '#475569' }
  };
};

export default function KanbanCard({ 
  task, onClick, onEdit, onDelete, isOverlay, isUpdating 
}: { 
  task: PipelineTask, onClick: () => void, onEdit: (task: PipelineTask) => void, onDelete: (id: number) => void, isOverlay?: boolean, isUpdating?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    data: { type: "Task", task },
    disabled: isOverlay || isUpdating
  });

  const { data: users } = useUsers();
  const { mutate: updateTask } = useUpdateTask();

  const handleAnalystChange = (analystId: string) => {
    updateTask({ id: task.id, data: { analyst_id: analystId === "unassigned" ? null : analystId } });
  };

  const colors = getPriorityColors(task);

  const followUpDate = task.follow_up_date ? new Date(task.follow_up_date + "T00:00:00") : null;
  let followUpTone = "text-muted-foreground";
  if (followUpDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((followUpDate.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) followUpTone = "text-red-600 dark:text-red-400 font-medium";
    else if (diffDays <= 1) followUpTone = "text-amber-600 dark:text-amber-400 font-medium";
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const cardContent = (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={() => {
        if (!isDragging && !isUpdating) {
          onClick();
        }
      }}
      className={`relative overflow-hidden p-4 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing shrink-0 h-40 flex flex-col
        ${isDragging ? "shadow-lg scale-105 z-50" : ""}
        ${isUpdating ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5" 
        style={{ backgroundColor: colors.borderStyle.borderLeftColor }} 
      />
      <div className="flex flex-col gap-2 h-full">
        <div className="flex flex-col items-start mb-1">
          <h4 className="font-semibold text-sm text-foreground break-words leading-tight pr-2 line-clamp-2">
            {task.company_name} 
          </h4>
          {(task.location || task.country_name) ? (
            <span className="text-xs text-muted-foreground font-normal mt-1 truncate w-full">
              {[task.location, task.country_name].filter(Boolean).join(", ")}
            </span>
          ) : null}
        </div>
        
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{task.name} {task.position_name ? `• ${task.position_name}` : ''}</span>
          </div>
          {task.industry_name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{task.industry_name}</span>
            </div>
          )}
          {followUpDate && (
            <div className={`flex items-center gap-2 text-xs ${followUpTone}`}>
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Follow-up {followUpDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            {task.analyst_name ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                  {getInitials(task.analyst_name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="h-3 w-3 text-slate-400" />
              </div>
            )}
            {task.analyst_name && <span className="text-xs text-muted-foreground font-medium">{task.analyst_name}</span>}
          </div>
          {task.priority_name && (
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={colors.badgeStyle}
            >
              {task.priority_name}
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  if (isOverlay) return cardContent;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {cardContent}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onEdit(task)} className="gap-2">
          <Edit className="h-4 w-4" /> Edit Task
        </ContextMenuItem>
        
        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <UserPlus className="h-4 w-4" /> Modify Analyst
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
            <ContextMenuRadioGroup 
              value={task.analyst_id || "unassigned"} 
              onValueChange={handleAnalystChange}
            >
              <ContextMenuRadioItem value="unassigned">Unassigned</ContextMenuRadioItem>
              {users?.map(u => (
                <ContextMenuRadioItem key={u.id} value={u.id}>
                  {u.full_name}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={() => onDelete(task.id)} className="gap-2 text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" /> Remove Task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
