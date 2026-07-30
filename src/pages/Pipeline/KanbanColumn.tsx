import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type PipelineTask } from "@/hooks/usePipeline";
import KanbanCard, { getPriorityColors } from "./KanbanCard";
import { GripVertical, Plus } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

export default function KanbanColumn({ 
  column, onTaskClick, onEdit, onDelete, onCreate, isOverlay, updatingTaskIds 
}: { 
  column: { id: number, title: string, color?: string, tasks: PipelineTask[] }, 
  onTaskClick: (task: PipelineTask) => void, 
  onEdit: (task: PipelineTask) => void, 
  onDelete: (id: number) => void, 
  onCreate: (priorityId: number) => void,
  isOverlay?: boolean,
  updatingTaskIds?: Set<number>
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "Column",
      column,
    },
    disabled: isOverlay
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const colors = getPriorityColors({ priority_name: column.title, priority_color: column.color });

  const columnContent = (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colors.borderTopStyle }}
      className={`w-80 shrink-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-x-2 border-b-2 border-transparent overflow-hidden transition-colors border-t-4 ${
        isOverlay ? "shadow-2xl scale-105 z-50 ring-2 ring-primary" : ""
      }`}
    >
      <div className={`p-4 border-b flex items-center justify-between bg-opacity-30 dark:bg-opacity-20`} style={colors.badgeStyle}>
        <div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners}>
          <GripVertical className={`h-4 w-4 cursor-grab active:cursor-grabbing shrink-0 opacity-50`} />
          <h3 className="font-bold text-sm truncate flex-1 uppercase tracking-wider">{column.title}</h3>
        </div>
        <span className="bg-background text-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-sm">
          {column.tasks.length}
        </span>
      </div>
      
      <div 
        className={`flex-1 overflow-y-auto rounded-b-xl p-2 transition-colors ${
          isOver ? "bg-primary/5 border-2 border-dashed border-primary/50 m-1" : "bg-muted/30 border-2 border-transparent m-1"
        }`}
      >
        <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 min-h-[150px] h-full">
            {column.tasks.map(task => (
              <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} onEdit={onEdit} onDelete={onDelete} isUpdating={updatingTaskIds?.has(task.id)} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );

  if (isOverlay) return columnContent;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {columnContent}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onCreate(column.id)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
