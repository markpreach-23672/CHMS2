import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [cards, workflows, enrollments, tags] = await Promise.all([
      base44.asServiceRole.entities.ConnectCard.list(),
      base44.asServiceRole.entities.Workflow.list(),
      base44.asServiceRole.entities.WorkflowEnrollment.list(),
      base44.asServiceRole.entities.Tag.list(),
    ]);

    // Load steps for each workflow
    const stepsMap = {};
    await Promise.all(workflows.map(async (wf) => {
      const ws = await base44.asServiceRole.entities.WorkflowStep.filter({ workflow_id: wf.id });
      ws.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      stepsMap[wf.id] = ws;
    }));

    // Load users — only admins can list users
    let users = [];
    if (user.role === 'admin') {
      try {
        users = await base44.asServiceRole.entities.User.list();
      } catch (e) {
        console.error('User list failed:', e.message);
      }
    }

    return Response.json({
      cards,
      workflows,
      steps: stepsMap,
      enrollments,
      tags,
      users,
    });
  } catch (error) {
    console.error('getConnectCardData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});