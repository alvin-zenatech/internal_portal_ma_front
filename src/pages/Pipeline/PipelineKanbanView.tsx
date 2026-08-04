import React, { useState, useMemo, useEffect, useRef } from "react";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { type PipelineTask, type PriorityData, useUpdateTaskStatus, useUpdatePriorityOrder } from "@/hooks/usePipeline";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PipelineKanbanView = React.memo(function PipelineKanbanView({ 
  tasks, priorities, onTaskClick, onEdit, onDelete, onCreate, isCompact, zoomLevel = 1
}: { 
  tasks: PipelineTask[], priorities: PriorityData[], onTaskClick: (task: PipelineTask) => void,
  onEdit: (task: PipelineTask) => void, onDelete: (id: number) => void, onCreate: (priorityId: number) => void,
  isCompact?: boolean, zoomLevel?: number
}) {
  const { mutate: updateStatus } = useUpdateTaskStatus();
  const { mutate: updatePriorityOrder } = useUpdatePriorityOrder();

  const [localPriorities, setLocalPriorities] = useState(priorities);
  useEffect(() => {
    setLocalPriorities(priorities);
  }, [priorities]);

  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const columns = useMemo(() => {
    return localPriorities.map(p => ({
      id: p.id,
      priorityId: p.id,
      title: p.name,
      color: p.color,
      tasks: localTasks.filter(t => t.priority_id === p.id)
    }));
  }, [localPriorities, localTasks]);

  const [activeColumn, setActiveColumn] = useState<any>(null);
  const [activeTask, setActiveTask] = useState<any>(null);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);



  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;
    
    if (type === "Column") {
      setActiveColumn(active.data.current?.column);
    } else if (type === "Task") {
      setActiveTask(active.data.current?.task);
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    
    const isActiveTask = active.data.current?.type === "Task";
    if (!isActiveTask) return;

    let targetPriorityId = -1;
    if (String(overId).startsWith("column-")) {
      targetPriorityId = Number(String(overId).replace("column-", ""));
    } else {
      const overTask = localTasks.find(t => t.id === Number(overId));
      if (overTask && overTask.priority_id) {
        targetPriorityId = overTask.priority_id;
      }
    }

    if (targetPriorityId !== -1) {
      const activeTask = localTasks.find(t => t.id === Number(activeId));
      if (activeTask && activeTask.priority_id !== targetPriorityId) {
        setLocalTasks(prev => prev.map(t => 
          t.id === Number(activeId) ? { ...t, priority_id: targetPriorityId } : t
        ));
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveColumn(null);
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) return;

    const isActiveColumn = active.data.current?.type === "Column";

    if (isActiveColumn) {
      const activePriorityId = Number(String(activeId).replace("column-", ""));
      const overPriorityId = Number(String(overId).replace("column-", ""));
      
      const oldIndex = localPriorities.findIndex(p => p.id === activePriorityId);
      const newIndex = localPriorities.findIndex(p => p.id === overPriorityId);
      
      const newPriorities = arrayMove(localPriorities, oldIndex, newIndex);
      setLocalPriorities(newPriorities);
      
      const updatePayload = newPriorities.map((p, index) => ({ id: p.id, sort_order: index }));
      updatePriorityOrder(updatePayload);
      return;
    }

    const activeTaskId = Number(activeId);
    let targetPriorityId = -1;
    
    if (String(overId).startsWith("column-")) {
      targetPriorityId = Number(String(overId).replace("column-", ""));
    } else {
      const overTask = localTasks.find(t => t.id === Number(overId));
      if (overTask && overTask.priority_id) {
        targetPriorityId = overTask.priority_id;
      }
    }
    
    if (targetPriorityId !== -1) {
      const activeTask = localTasks.find(t => t.id === activeTaskId);
      if (activeTask && activeTask.priority_id !== targetPriorityId) {
        // Optimistic update for instant feedback
        setLocalTasks(prev => prev.map(t => 
          t.id === activeTaskId ? { ...t, priority_id: targetPriorityId } : t
        ));
        
        setUpdatingTaskIds(prev => new Set(prev).add(activeTaskId));
        
        updateStatus(
          { id: activeTaskId, priority_id: targetPriorityId },
          {
            onSettled: () => {
              setUpdatingTaskIds(prev => {
                const next = new Set(prev);
                next.delete(activeTaskId);
                return next;
              });
            }
          }
        );
      }
    }
  };

  const scrollToColumn = (id: number | string) => {
    const el = document.getElementById(`kanban-col-${id}`);
    if (el && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      const scrollLeft = container.scrollLeft + elRect.left - containerRect.left - (containerRect.width / 2) + (elRect.width / 2);
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
      const scrollAmount = 300;
      navScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 p-4 bg-muted/10 border-b shrink-0 relative group">
        <span className="text-sm font-semibold text-muted-foreground mr-2 whitespace-nowrap">Jump to:</span>
        
        <button 
          onClick={() => scrollNav('left')} 
          className="absolute left-20 z-10 p-1 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div 
          ref={navScrollRef} 
          className="flex flex-1 items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth px-4"
        >
          {columns.map(col => (
            <button 
              key={col.id} 
              onClick={() => scrollToColumn(col.id)}
              className="px-3 py-1 text-xs font-semibold rounded-full border shadow-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 uppercase whitespace-nowrap"
              style={{ 
                backgroundColor: col.color ? `${col.color}15` : '#f1f5f9', 
                color: col.color || '#475569', 
                borderColor: col.color ? `${col.color}40` : '#cbd5e1' 
              }}
            >
              {col.title} ({col.tasks.length})
            </button>
          ))}
        </div>

        <button 
          onClick={() => scrollNav('right')} 
          className="absolute right-4 z-10 p-1 rounded-full bg-background border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div 
        ref={scrollContainerRef}
        className="flex-1 w-full overflow-x-auto p-6 bg-muted/20 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
      >
        <div style={{ zoom: zoomLevel, transformOrigin: 'top left' }} className="h-full">
        <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragOver={handleDragOver} 
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="flex gap-6 h-full min-w-max pb-4">
          <SortableContext items={columns.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <KanbanColumn key={col.id} column={col} updatingTaskIds={updatingTaskIds} onTaskClick={onTaskClick} onEdit={onEdit} onDelete={onDelete} onCreate={onCreate} isCompact={isCompact} />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeColumn ? (
            <KanbanColumn column={activeColumn} onTaskClick={() => {}} onEdit={() => {}} onDelete={() => {}} onCreate={() => {}} isOverlay isCompact={isCompact} />
          ) : null}
          {activeTask ? (
            <KanbanCard task={activeTask} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} isOverlay isCompact={isCompact} />
          ) : null}
        </DragOverlay>
      </DndContext>
      </div>
      </div>
    </div>
  );
});

export default PipelineKanbanView;
