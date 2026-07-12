import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CareGroupCard from '@/components/caregroups/CareGroupCard';
import CareGroupForm from '@/components/caregroups/CareGroupForm';
import CareGroupDetail from '@/components/caregroups/CareGroupDetail';
import { HeartHandshake, Plus } from 'lucide-react';

export default function CareGroups() {
  const [churchId, setChurchId] = useState(null);
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const loadGroups = useCallback(async (cid) => {
    const query = cid ? { church_id: cid } : {};
    const list = await base44.entities.CareGroup.filter(query, 'name');
    setGroups(list);
    setSelectedGroup((prev) => prev ? list.find(g => g.id === prev.id) || null : null);
  }, []);

  useEffect(() => {
    (async () => {
      let cid = null;
      try {
        const user = await base44.auth.me();
        cid = user?.church_id || null;
      } catch (e) { /* not logged in */ }
      setChurchId(cid);
      const [ppl] = await Promise.all([
        cid ? base44.entities.Person.filter({ church_id: cid }, 'first_name') : base44.entities.Person.list('first_name'),
        loadGroups(cid),
      ]);
      setPeople(ppl);
      setLoading(false);
    })();
  }, [loadGroups]);

  const handleDelete = async (group) => {
    if (!confirm(`Delete the "${group.name}" care group? Its calendar and events will also be removed.`)) return;
    if (group.calendar_id) {
      await base44.entities.CalendarEvent.deleteMany({ calendar_id: group.calendar_id });
      await base44.entities.DepartmentCalendar.delete(group.calendar_id);
    }
    await base44.entities.CareGroup.delete(group.id);
    loadGroups(churchId);
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const peopleById = Object.fromEntries(people.map(p => [p.id, p]));

  return (
    <div className="p-6 md:p-8 space-y-6">
      {selectedGroup ? (
        <CareGroupDetail
          group={selectedGroup}
          people={people}
          churchId={churchId}
          onBack={() => setSelectedGroup(null)}
          onEdit={() => { setEditingGroup(selectedGroup); setShowForm(true); }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="text-indigo-500" size={24} /> Care Groups
              </h1>
              <p className="text-sm text-slate-500">Assign leaders and members to care ministries, each with its own calendar.</p>
            </div>
            <Button onClick={() => { setEditingGroup(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus size={15} /> New Care Group
            </Button>
          </div>

          {groups.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
              <HeartHandshake size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-700">No care groups yet</h3>
              <p className="text-sm text-slate-500 mt-1">Create groups like Elder Care, Hospital Care, or Mommy Care to organize your ministry.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => (
                <CareGroupCard
                  key={g.id}
                  group={g}
                  leader={g.leader_id ? peopleById[g.leader_id] : null}
                  onOpen={() => setSelectedGroup(g)}
                  onEdit={() => { setEditingGroup(g); setShowForm(true); }}
                  onDelete={() => handleDelete(g)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showForm && (
        <CareGroupForm
          open={showForm}
          onOpenChange={setShowForm}
          group={editingGroup}
          people={people}
          churchId={churchId}
          onSaved={() => loadGroups(churchId)}
        />
      )}
    </div>
  );
}