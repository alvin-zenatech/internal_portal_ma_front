import { useState, useMemo, useEffect, useRef } from "react";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { type PipelineTask, type PriorityData, useUpdateTaskStatus, useUpdatePriorityOrder } from "@/hooks/usePipeline";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";

export default function PipelineKanbanView({ 
  tasks, priorities, onTaskClick, onEdit, onDelete, onCreate 
}: { 
  tasks: PipelineTask[], priorities: PriorityData[], onTaskClick: (task: PipelineTask) => void,
  onEdit: (task: PipelineTask) => void, onDelete: (id: number) => void, onCreate: (priorityId: number) => void
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



  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type;
    
    if (type === "Column") {
      setActiveColumn(active.data.current?.column);
    } else if (type === "Task") {
      setActiveTask(active.data.current?.task);
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

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full w-full overflow-x-auto p-6 bg-muted/20 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
    >
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 h-full min-w-max pb-4">
          <SortableContext items={columns.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
            {columns.map(col => (
              <KanbanColumn key={col.id} column={col} updatingTaskIds={updatingTaskIds} onTaskClick={onTaskClick} onEdit={onEdit} onDelete={onDelete} onCreate={onCreate} />
            ))}
          </SortableContext>
        </div>
        <DragOverlay>
          {activeColumn ? (
            <KanbanColumn column={activeColumn} onTaskClick={() => {}} onEdit={() => {}} onDelete={() => {}} onCreate={() => {}} isOverlay />
          ) : null}
          {activeTask ? (
            <KanbanCard task={activeTask} onClick={() => {}} onEdit={() => {}} onDelete={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
