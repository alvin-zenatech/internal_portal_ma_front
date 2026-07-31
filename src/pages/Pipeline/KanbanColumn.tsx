import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { type PipelineTask } from "@/hooks/usePipeline";
import KanbanCard, { getPriorityColors } from "./KanbanCard";
import { useState } from "react";
import { GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

export default function KanbanColumn({ 
  column, onTaskClick, onEdit, onDelete, onCreate, isOverlay, updatingTaskIds 
}: { 
  column: { id: string | number, priorityId: number, title: string, color?: string, tasks: PipelineTask[] }, 
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

  const titleUpper = column.title.trim().toUpperCase();
  const [isCollapsed, setIsCollapsed] = useState(titleUpper === "NOT READY TO SELL" || titleUpper === "NOT A FIT");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const colors = getPriorityColors({ priority_name: column.title, priority_color: column.color });

  const chunkedTasks: PipelineTask[][] = [];
  for (let i = 0; i < column.tasks.length; i += 10) {
    chunkedTasks.push(column.tasks.slice(i, i + 10));
  }
  if (chunkedTasks.length === 0) chunkedTasks.push([]); // Ensure empty columns render properly

  const columnContent = (
    <div
      ref={setNodeRef}
      style={{ ...style, ...colors.borderTopStyle }}
      className={`shrink-0 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-x-2 border-b-2 border-transparent transition-all duration-300 ease-in-out border-t-4 max-w-[90vw] overflow-hidden ${
        isCollapsed ? "w-72 max-w-[288px]" : "w-max min-w-[320px]"
      } ${isOverlay ? "shadow-2xl scale-105 z-50 ring-2 ring-primary" : ""}`}
    >
      <div 
        className={`p-4 border-b flex items-center justify-between bg-opacity-30 dark:bg-opacity-20 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`} 
        style={colors.badgeStyle}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners}>
          <GripVertical className={`h-4 w-4 cursor-grab active:cursor-grabbing shrink-0 opacity-50`} />
          <h3 className="font-bold text-sm truncate flex-1 uppercase tracking-wider select-none">{column.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-background text-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-sm">
            {column.tasks.length}
          </span>
          <div className="p-1 rounded text-muted-foreground">
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>
      
      <div 
        className={`flex-1 overflow-x-auto overflow-y-auto rounded-b-xl transition-all duration-300 ease-in-out origin-top ${
          isCollapsed ? "opacity-0 max-h-0 scale-y-95 pointer-events-none p-0 border-0 m-0" : "opacity-100 max-h-[2000px] scale-y-100 p-2"
        } ${
          isOver && !isCollapsed ? "bg-primary/5 border-2 border-dashed border-primary/50 m-1" : "bg-muted/30 border-2 border-transparent m-1"
        }`}
      >
        <SortableContext items={column.tasks.map(t => t.id)} strategy={rectSortingStrategy}>
          <div className="flex gap-4 min-h-[150px] h-full">
            {chunkedTasks.map((chunk, chunkIdx) => (
              <div key={chunkIdx} className="flex flex-col gap-3 w-[300px] shrink-0 min-h-full">
                {chunk.map(task => (
                  <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} onEdit={onEdit} onDelete={onDelete} isUpdating={updatingTaskIds?.has(task.id)} />
                ))}
              </div>
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
        <ContextMenuItem onClick={() => onCreate(column.priorityId)} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
