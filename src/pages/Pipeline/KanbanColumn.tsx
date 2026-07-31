import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { type PipelineTask } from "@/hooks/usePipeline";
import KanbanCard, { getPriorityColors } from "./KanbanCard";
import { useState } from "react";
import { GripVertical, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

import { memo } from "react";

const PureKanbanColumn = memo(({ 
  column, onTaskClick, onEdit, onDelete, onCreate, isOverlay, updatingTaskIds,
  isCollapsed, setIsCollapsed, colors, isOver, isDragging, attributes, listeners, isCompact
}: any) => {
  const columnContent = (
    <div
      className={`shrink-0 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border-x-2 border-b-2 border-transparent transition-[width,background-color,border-color] duration-300 ease-in-out border-t-4 max-w-[90vw] overflow-hidden ${
        isCollapsed ? "w-72 max-w-[288px]" : (isCompact ? "w-[270px]" : "w-[330px]")
      } ${isOverlay ? "shadow-2xl scale-105 z-50 ring-2 ring-primary" : ""}`}
      style={colors.borderTopStyle}
    >


      <div 
        className={`p-4 border-b flex items-center justify-between bg-opacity-30 dark:bg-opacity-20 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`} 
        style={colors.badgeStyle}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0" {...attributes} {...listeners}>
          <GripVertical className={`cursor-grab active:cursor-grabbing shrink-0 opacity-50 ${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />
          <h3 className={`font-bold truncate flex-1 uppercase tracking-wider select-none ${isCompact ? "text-xs" : "text-sm"}`}>{column.title}</h3>
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
        className={`flex-1 overflow-x-auto overflow-y-auto rounded-b-xl transition-colors duration-300 ease-in-out origin-top ${
          isCollapsed ? "opacity-0 max-h-0 scale-y-95 pointer-events-none p-0 border-0 m-0" : "opacity-100 max-h-[2000px] scale-y-100 p-2"
        } ${
          isOver && !isCollapsed ? "bg-primary/5 border-2 border-dashed border-primary/50 m-1" : "bg-muted/30 border-2 border-transparent m-1"
        }`}
      >
        {isOverlay ? (
          <div className="flex flex-col gap-3 min-h-[150px] h-full pointer-events-none">
            {column.tasks.map(task => (
              <KanbanCard key={task.id} task={task} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} isOverlay isCompact={isCompact} />
            ))}
          </div>
        ) : (
          <SortableContext items={column.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className={`flex flex-col gap-3 min-h-[150px] h-full ${isDragging ? "opacity-0" : ""}`}>
              {column.tasks.map(task => (
                <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task)} onEdit={onEdit} onDelete={onDelete} isUpdating={updatingTaskIds?.has(task.id)} isCompact={isCompact} />
              ))}
            </div>
          </SortableContext>
        )}
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
});

export default function KanbanColumn({ 
  column, onTaskClick, onEdit, onDelete, onCreate, isOverlay, updatingTaskIds, isCompact 
}: { 
  column: { id: string | number, priorityId: number, title: string, color?: string, tasks: PipelineTask[] }, 
  onTaskClick: (task: PipelineTask) => void, 
  onEdit: (task: PipelineTask) => void, 
  onDelete: (id: number) => void, 
  onCreate: (priorityId: number) => void,
  isOverlay?: boolean,
  updatingTaskIds?: Set<number>,
  isCompact?: boolean
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging, isOver } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: "Column",
      column,
    },
    disabled: isOverlay
  });

  const [isCollapsed, setIsCollapsed] = useState(false);
  const colors = getPriorityColors({ priority_name: column.title, priority_color: column.color });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div id={`kanban-col-${column.id}`} ref={setNodeRef} style={style} className="shrink-0 h-full">
      <PureKanbanColumn 
        column={column} onTaskClick={onTaskClick} onEdit={onEdit} onDelete={onDelete} onCreate={onCreate} isOverlay={isOverlay} updatingTaskIds={updatingTaskIds}
        isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} colors={colors} isOver={isOver} isDragging={isDragging} attributes={attributes} listeners={listeners} isCompact={isCompact}
      />
    </div>
  );
}
