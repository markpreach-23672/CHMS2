// Resolve the full list of person IDs a task is assigned to (individuals + group members)
export function resolveAssigneeIds(task, careGroups = [], serviceTeams = []) {
  const ids = new Set(task.assignee_person_ids || []);
  if (task.assignee_group_id) {
    if (task.assignee_group_type === 'care_group') {
      const g = careGroups.find((x) => x.id === task.assignee_group_id);
      if (g) {
        (g.member_ids || []).forEach((id) => ids.add(id));
        if (g.leader_id) ids.add(g.leader_id);
      }
    } else if (task.assignee_group_type === 'service_team') {
      const t = serviceTeams.find((x) => x.id === task.assignee_group_id);
      if (t) (t.members || []).forEach((m) => m.person_id && ids.add(m.person_id));
    }
  }
  return [...ids];
}

export function groupLabel(task, careGroups = [], serviceTeams = []) {
  if (!task.assignee_group_id) return null;
  const list = task.assignee_group_type === 'care_group' ? careGroups : serviceTeams;
  return list.find((x) => x.id === task.assignee_group_id)?.name || null;
}