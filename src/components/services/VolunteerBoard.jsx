import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import VolunteerCard from '@/components/services/VolunteerCard';
import { UserPlus, CircleSlash } from 'lucide-react';

const STATUS_COLUMNS = [
  { id: 'scheduled', label: 'Scheduled', color: 'bg-amber-400' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { id: 'declined', label: 'Declined', color: 'bg-red-400' },
];

export default function VolunteerBoard({ assignments, people, openPositions, onStatusChange, onPositionChange, onRemove, onAssignPosition }) {
  const personName = (id) => {
    const p = people.find((x) => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
  };

  const byStatus = (status) => assignments.filter((a) => (a.status || 'scheduled') === status);

  const handleDragEnd = ({ destination, draggableId }) => {
    if (!destination) return;
    const assignment = assignments.find((a) => a.id === draggableId);
    if (!assignment) return;
    if (destination.droppableId.startsWith('pos:')) {
      const position = destination.droppableId.slice(4);
      if (assignment.position !== position) onPositionChange(assignment, position);
      return;
    }
    const status = destination.droppableId.slice(7);
    if ((assignment.status || 'scheduled') !== status) onStatusChange(assignment, status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CircleSlash size={13} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Open Positions</span>
            <span className="text-xs text-slate-400 ml-auto">{openPositions.length}</span>
          </div>
          {openPositions.length === 0 ? (
            <p className="text-xs text-slate-400 px-1 py-4 text-center">Every position is filled.</p>
          ) : (
            <div className="space-y-2">
              {openPositions.map((pos) => (
                <Droppable droppableId={`pos:${pos}`} key={pos}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`rounded-lg border px-2.5 py-2 flex items-center gap-2 transition-colors ${snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
                      <span className="text-sm text-slate-600 flex-1 truncate">{pos}</span>
                      <button onClick={() => onAssignPosition(pos)} title={`Assign someone as ${pos}`}
                        className="text-slate-300 hover:text-indigo-600 p-0.5">
                        <UserPlus size={14} />
                      </button>
                      <div className="w-0 h-0 overflow-hidden">{provided.placeholder}</div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-3 px-1">Drop a volunteer onto a position to move them into that role.</p>
        </div>

        {STATUS_COLUMNS.map((col) => (
          <Droppable droppableId={`status:${col.id}`} key={col.id}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={`rounded-xl border border-slate-200 p-3 min-h-[260px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50' : 'bg-slate-50/60'}`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">{byStatus(col.id).length}</span>
                </div>
                <div className="space-y-2">
                  {byStatus(col.id).map((a, idx) => (
                    <Draggable draggableId={a.id} index={idx} key={a.id}>
                      {(dp) => (
                        <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}>
                          <VolunteerCard assignment={a} personName={personName(a.person_id)} onRemove={onRemove} />
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