import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type PipelineTask } from "@/hooks/usePipeline";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, User, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

export const getPriorityColors = (taskOrName: Partial<PipelineTask> | string) => {
  const name = typeof taskOrName === 'string' ? taskOrName : taskOrName?.priority_name || "";
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

  const colors = getPriorityColors(task);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    ...colors.borderStyle
  };

  const cardContent = (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={(e) => {
        if (!isDragging && !isUpdating) {
          onClick();
        }
      }}
      className={`p-4 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing border-l-4 
        ${isDragging ? "shadow-lg scale-105 z-50" : ""}
        ${isUpdating ? "opacity-50 pointer-events-none cursor-not-allowed" : ""}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-sm text-foreground flex-1 break-words leading-tight pr-2">
            {task.company_name} 
            {(task.location || task.country_name) ? (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({[task.location, task.country_name].filter(Boolean).join(" - ")})
              </span>
            ) : null}
          </h4>
        </div>
        
        <div className="space-y-1.5 mt-1">
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
        </div>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {task.analyst_name ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                  {task.analyst_name.charAt(0).toUpperCase()}
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
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onEdit(task)} className="gap-2">
          <Edit className="h-4 w-4" /> Edit Task
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete(task.id)} className="gap-2 text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" /> Remove Task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
