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
    if (['super_admin', 'church_admin'].includes(user.role)) {
      try {
        users = await base44.asServiceRole.entities.User.list();
      } catch (e) {
        console.error('User list failed:', e.message);
      }
    }

    // Resolve the signed-in staff member's mobile from their linked People record
    let staffMobile = '';
    if (user.email) {
      try {
        const mePeople = await base44.asServiceRole.entities.Person.filter({ email: user.email });
        const mePerson = mePeople[0];
        if (mePerson) staffMobile = mePerson.mobile || mePerson.phone || '';
      } catch (e) {
        console.error('Staff mobile lookup failed:', e.message);
      }
    }

    return Response.json({
      cards,
      workflows,
      steps: stepsMap,
      enrollments,
      tags,
      users,
      twilio_number: Deno.env.get("TWILIO_PHONE_NUMBER") || '',
      staff_mobile: staffMobile,
    });
  } catch (error) {
    console.error('getConnectCardData error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});