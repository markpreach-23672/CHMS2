// Shared key that authorizes workflow/cron-triggered invocations of backend functions.
export const CRON_KEY = 'efc_cron_9d4b71a6f3e24c58b0a7d1c9e6f28453';

// A request is authorized if it carries the cron key, or comes from a logged-in admin.
export async function isWorkflowAuthorized(base44: any, body: any): Promise<boolean> {
  if (body?.cron_key === CRON_KEY) return true;
  try {
    const user = await base44.auth.me();
    return !!user && ['super_admin', 'church_admin', 'admin'].includes(user.role);
  } catch {
    return false;
  }
}