import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TaskList from '@/components/tasks/TaskList';
import TaskKanban from '@/components/tasks/TaskKanban';
import ReachOutBoard from '@/components/tasks/ReachOutBoard';
import TaskForm from '@/components/tasks/TaskForm';
import CategoryManager from '@/components/tasks/CategoryManager';
import { resolveAssigneeIds } from '@/components/tasks/taskUtils';
import { ListTodo, Plus, FolderCog, List, LayoutGrid } from 'lucide-react';
import { getMyChurchId } from '@/lib/churchContext';

export default function Tasks() {
  const [user, setUser] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [people, setPeople] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [careGroups, setCareGroups] = useState([]);
  const [serviceTeams, setServiceTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [view, setView] = useState('list');

  const loadTasks = useCallback(async () => {
    setTasks(await base44.entities.Task.list('-created_date', 500));
  }, []);

  const loadCategories = useCallback(async () => {
    setCategories(await base44.entities.TaskCategory.list('name'));
  }, []);

  useEffect(() => {
    (async () => {
      let u = null;
      try { u = await base44.auth.me(); } catch (e) { /* not logged in */ }
      setUser(u);
      const [ppl, groups, teams, cid] = await Promise.all([
        base44.entities.Person.list('first_name', 1000),
        base44.entities.CareGroup.list(),
        base44.entities.ServiceTeam.list(),
        getMyChurchId(),
        loadTasks(),
        loadCategories(),
      ]);
      setChurchId(cid);
      setPeople(ppl);
      setCareGroups(groups);
      setServiceTeams(teams);
      setLoading(false);
    })();
  }, [loadTasks, loadCategories]);

  const myPerson = user ? people.find((p) => p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()) : null;
  const myPersonId = myPerson?.id || null;

  const handleToggleComplete = async (task) => {
    if (!myPersonId) return;
    const completed = new Set(task.completed_person_ids || []);
    completed.has(myPersonId) ? completed.delete(myPersonId) : completed.add(myPersonId);
    const allIds = resolveAssigneeIds(task, careGroups, serviceTeams);
    const status = allIds.length > 0 && allIds.every((id) => completed.has(id)) ? 'completed' : 'open';
    await base44.entities.Task.update(task.id, { completed_person_ids: [...completed], status });
    loadTasks(churchId);
  };

  const handleStatusChange = async (task, status) => {
    const updates = { status };
    if (status === 'completed') updates.completed_person_ids = resolveAssigneeIds(task, careGroups, serviceTeams);
    else if (task.status === 'completed') updates.completed_person_ids = [];
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));
    await base44.entities.Task.update(task.id, updates);
    loadTasks();
  };

  const handleDelete = async (task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await base44.entities.Task.delete(task.id);
    loadTasks(churchId);
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const myTasks = tasks.filter((t) => myPersonId && resolveAssigneeIds(t, careGroups, serviceTeams).includes(myPersonId));
  const assignedByMe = tasks.filter((t) => user && t.assigned_by_user_id === user.id);
  // Tasks created by automations/workflows have a name but no human user behind them
  const reachOuts = tasks.filter((t) => !t.assigned_by_user_id && t.assigned_by_name);
  const canManage = user && ['super_admin', 'church_admin', 'admin'].includes(user.role);

  const listProps = { people, categories, careGroups, serviceTeams, myPersonId, onToggleComplete: handleToggleComplete, onEdit: (t) => { setEditingTask(t); setShowForm(true); }, onDelete: handleDelete };

  const renderTasks = (list, manage) =>
    view === 'board' ? (
      <TaskKanban tasks={list} people={people} categories={categories} careGroups={careGroups} serviceTeams={serviceTeams}
        canManage={manage} onStatusChange={handleStatusChange} onEdit={listProps.onEdit} onDelete={handleDelete} />
    ) : (
      <TaskList tasks={list} canManage={manage} {...listProps} />
    );

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListTodo className="text-indigo-500" size={24} /> Tasks & To-Dos
          </h1>
          <p className="text-sm text-slate-500">Assign projects and jobs to members, staff, or whole groups.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-slate-200 overflow-hidden">
            <button onClick={() => setView('list')} title="List view"
              className={`px-3 flex items-center ${view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <List size={15} />
            </button>
            <button onClick={() => setView('board')} title="Board view"
              className={`px-3 flex items-center ${view === 'board' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
              <LayoutGrid size={15} />
            </button>
          </div>
          <Button variant="outline" onClick={() => setShowCategories(true)}><FolderCog size={15} /> Categories</Button>
          <Button onClick={() => { setEditingTask(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={15} /> New Task
          </Button>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Tasks ({myTasks.filter((t) => t.status !== 'completed').length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned by Me ({assignedByMe.filter((t) => t.status !== 'completed').length})</TabsTrigger>
          <TabsTrigger value="reachouts">Reach-Outs ({reachOuts.filter((t) => t.status !== 'completed').length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="mine" className="mt-4">
          {!myPersonId && <p className="text-xs text-amber-600 mb-3">Your login email isn't linked to a person profile yet, so personal assignments can't be matched.</p>}
          {renderTasks(myTasks, false)}
        </TabsContent>
        <TabsContent value="assigned" className="mt-4">
          {renderTasks(assignedByMe, true)}
        </TabsContent>
        <TabsContent value="reachouts" className="mt-4">
          <ReachOutBoard tasks={reachOuts} people={people} categories={categories} careGroups={careGroups}
            serviceTeams={serviceTeams} canManage={canManage} onStatusChange={handleStatusChange}
            onEdit={listProps.onEdit} onDelete={handleDelete} />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          {renderTasks(tasks, canManage)}
        </TabsContent>
      </Tabs>

      {showForm && (
        <TaskForm open={showForm} onOpenChange={setShowForm} task={editingTask} user={user} people={people}
          categories={categories} careGroups={careGroups} serviceTeams={serviceTeams} churchId={churchId}
          onSaved={() => loadTasks(churchId)} />
      )}
      {showCategories && (
        <CategoryManager open={showCategories} onOpenChange={setShowCategories} categories={categories}
          churchId={churchId} onChanged={() => loadCategories(churchId)} />
      )}
    </div>
  );
}