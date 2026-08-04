import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanCard from '@/components/tasks/KanbanCard';

const COLUMNS = [
  { id: 'open', label: 'To Do', color: 'bg-yellow-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-500' },
];

export default function TaskKanban({ tasks, people, categories, careGroups, serviceTeams, canManage, onStatusChange, onEdit, onDelete, columns = COLUMNS }) {
  const byStatus = (status) => tasks.filter((t) => (t.status || 'open') === status);

  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || (task.status || 'open') === destination.droppableId) return;
    onStatusChange(task, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => (
          <Droppable droppableId={col.id} key={col.id}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={`rounded-xl border border-slate-200 p-3 min-h-[300px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50' : 'bg-slate-50/60'}`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">{byStatus(col.id).length}</span>
                </div>
                <div className="space-y-2">
                  {byStatus(col.id).map((task, idx) => (
                    <Draggable draggableId={task.id} index={idx} key={task.id}>
                      {(dp) => (
                        <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}>
                          <KanbanCard task={task} people={people} categories={categories} careGroups={careGroups}
                            serviceTeams={serviceTeams} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}